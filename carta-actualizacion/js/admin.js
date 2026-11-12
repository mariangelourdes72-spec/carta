/* =====================================================================
   Panel de administración — El Rinconcito
   Se abre en #/admin (o desde "El local" → Administración).
   Edita precios, disponibilidad, destacados, textos, productos nuevos,
   aviso del día, WhatsApp y horarios. Los cambios se guardan aparte de
   carta.js: "Restaurar carta original" vuelve a lo que dice carta.js.
   ===================================================================== */
(function () {
  "use strict";

  var api, root, draft, guardado, tab = "pedidos", pedidos = null, filtroPed = "activos", cortarPedidos = null, subiendo = null, modoPed = null, filtroCat = "todo", q = "", abierto = null, guardando = false;
  var DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
  function vacio() { return { productos: {}, nuevos: [], local: {}, aviso: "" }; }
  function normalizar(a) {
    var d = Object.assign(vacio(), clone(a));
    d.productos = d.productos || {}; d.nuevos = d.nuevos || []; d.local = d.local || {}; d.aviso = d.aviso || "";
    delete d.actualizado;
    return d;
  }
  function firma(d) { return JSON.stringify(limpiar(d)); }
  function limpiar(d) {
    var out = clone(d);
    Object.keys(out.productos).forEach(function (id) { if (!Object.keys(out.productos[id]).length) delete out.productos[id]; });
    return out;
  }
  function sucio() { return !!draft && firma(draft) !== firma(guardado); }
  function nCambios() {
    if (!draft) return 0;
    var a = limpiar(draft), b = limpiar(guardado), n = 0;
    var ids = {}; Object.keys(a.productos).concat(Object.keys(b.productos)).forEach(function (k) { ids[k] = 1; });
    Object.keys(ids).forEach(function (k) { if (JSON.stringify(a.productos[k] || {}) !== JSON.stringify(b.productos[k] || {})) n++; });
    if (JSON.stringify(a.nuevos) !== JSON.stringify(b.nuevos)) n++;
    if (JSON.stringify(a.local) !== JSON.stringify(b.local)) n++;
    if (a.aviso !== b.aviso) n++;
    if (JSON.stringify(a.recomendados || null) !== JSON.stringify(b.recomendados || null) || (a.recPorHora !== false) !== (b.recPorHora !== false)) n++;
    return n;
  }

  /* ---------- Datos efectivos de un producto (original + cambios) ---------- */
  function todos() {
    var base = api.base().map(function (p) { return { raw: p, nuevo: false }; });
    var nuevos = draft.nuevos.map(function (p) { return { raw: p, nuevo: true }; });
    return base.concat(nuevos).map(function (x) {
      var c = draft.productos[x.raw.id] || {};
      var e = Object.assign({}, x.raw, c);
      e.precio = Number(e.precio) || 0;
      e.disponible = e.disponible !== false;
      e._nuevo = x.nuevo; e._raw = x.raw; e._c = c;
      if (Array.isArray(draft.recomendados)) e.destacado = draft.recomendados.indexOf(e.id) !== -1;
      return e;
    });
  }
  /* ---------- Recomendados ---------- */
  function recLista() {
    if (Array.isArray(draft.recomendados)) return draft.recomendados.slice();
    return todos().filter(function (p) { return p.destacado && !p.oculto; }).map(function (p) { return p.id; });
  }
  function setRec(id, on) {
    var l = recLista().filter(function (x) { return x !== id; });
    if (on) l.push(id);
    draft.recomendados = l;
  }
  function vistaRecomendados() {
    var lista = recLista(), por = {};
    todos().forEach(function (p) { por[p.id] = p; });
    var resto = todos().filter(function (p) { return lista.indexOf(p.id) === -1 && !p.oculto; });
    var hora = draft.recPorHora !== false;
    return '<section class="adm-block"><h3>Lo que recomienda la casa</h3>' +
      '<p class="hint">Son las tarjetas grandes de colores del inicio. Elegí cuáles aparecen y en qué orden.</p>' +
      '<label class="adm-sw"><input type="checkbox" data-adm="rec-hora"' + (hora ? " checked" : "") + '><span class="tr"></span><span>Ordenar solas según la hora (desayuno, almuerzo, merienda)</span></label>' +
      (hora ? '<p class="hint">Con esto prendido, el orden de abajo se ajusta solo según el momento del día. Apagalo para usar tu orden.</p>' : "") +
      "</section>" +
      '<div class="adm-list">' + (lista.length ? lista.map(function (id, i) {
        var p = por[id]; if (!p) return "";
        var pv = { id: p.id, nombre: p.nombre, foto: p.foto || "" };
        return '<article class="adm-row rec-row"><span class="rec-n">' + (i + 1) + "</span>" +
          '<span class="' + api.photoCls(pv) + ' adm-thumb"' + api.lq(pv) + ">" + (p.foto ? api.media(pv) : "") + "</span>" +
          '<div class="adm-info"><b>' + esc(p.nombre) + "</b><span class=\"hint\" style=\"margin:0\">" + fmt(p.precio) + (p.disponible ? "" : " · Agotado") + "</span></div>" +
          '<div class="rec-acc">' +
          '<button class="icon-btn sm" data-adm="rec-sube" data-id="' + esc(id) + '" aria-label="Subir"' + (i === 0 ? " disabled" : "") + ">" + ic("chevron") + "</button>" +
          '<button class="icon-btn sm rec-baja" data-adm="rec-baja" data-id="' + esc(id) + '" aria-label="Bajar"' + (i === lista.length - 1 ? " disabled" : "") + ">" + ic("chevron") + "</button>" +
          '<button class="icon-btn sm" data-adm="rec-quita" data-id="' + esc(id) + '" aria-label="Quitar">' + ic("x") + "</button></div></article>";
      }).join("") : '<p class="hint" style="padding:20px;text-align:center">No hay recomendados. Agregá alguno abajo.</p>') + "</div>" +
      '<section class="adm-block" style="margin-top:18px"><label class="adm-field"><span>Agregar a los recomendados</span>' +
      '<select class="input" data-adm="rec-agrega"><option value="">Elegí un producto…</option>' +
      api.categorias.map(function (c) {
        var ps = resto.filter(function (p) { return p.categoria === c.id; });
        return ps.length ? '<optgroup label="' + esc(c.nombre) + '">' + ps.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.nombre) + "</option>"; }).join("") + "</optgroup>" : "";
      }).join("") + "</select></label>" +
      '<p class="hint">Consejo: entre 6 y 12 queda lindo. Los que tienen foto sin fondo se ven mejor en las tarjetas.</p></section>';
  }

  function setCampo(id, campo, valor) {
    var nuevo = draft.nuevos.filter(function (n) { return n.id === id; })[0];
    if (nuevo) { nuevo[campo] = valor; return; }
    var raw = api.base().filter(function (p) { return p.id === id; })[0];
    var orig = raw[campo];
    if (campo === "disponible") orig = raw.disponible !== false;
    if (campo === "destacado") orig = !!raw.destacado;
    if (campo === "oculto") orig = false;
    var c = draft.productos[id] || (draft.productos[id] = {});
    if (JSON.stringify(valor) === JSON.stringify(orig)) delete c[campo]; else c[campo] = valor;
    if (!Object.keys(c).length) delete draft.productos[id];
  }

  /* ---------- Vistas ---------- */
  var esc, ic, fmt;
  function header() {
    return '<header class="header adm-header"><a class="icon-btn" href="#/local" aria-label="Volver">' + ic("back") + "</a><h1>Administración</h1>" +
      '<span class="adm-hd-r">' + (api.nube.modo === "web" && api.puede() ? '<button class="link adm-salir" data-adm="salir">Salir</button>' : "") +
      '<span class="adm-dot ' + estadoClase() + '" title="' + esc(estadoTexto()) + '"></span></span></header>';
  }
  function estadoClase() { return api.nube.estado === "nube" ? "ok" : api.nube.estado === "error" ? "err" : "test"; }
  function estadoTexto() {
    if (api.nube.estado === "nube") return "Conectado: los cambios que guardes los ven todos los clientes al instante.";
    if (api.nube.estado === "error") return "No se pudo conectar. Revisá la conexión e intentá de nuevo.";
    if (api.nube.estado === "conectando") return "Conectando…";
    return "Modo prueba: los cambios se guardan solo en este dispositivo.";
  }
  function tabs() {
    var act = (pedidos || []).filter(function (o) { return esActivo(o); }).length;
    var t = [["pedidos", "Pedidos" + (act ? " (" + act + ")" : "")], ["productos", "Productos"], ["recomendados", "Recomendados"], ["nuevo", "Nuevo producto"], ["local", "Local y aviso"]];
    return '<div class="adm-tabs" role="tablist">' + t.map(function (x) {
      return '<button class="chip' + (tab === x[0] ? " on" : "") + '" role="tab" aria-selected="' + (tab === x[0]) + '" data-adm="tab" data-v="' + x[0] + '">' + x[1] + "</button>";
    }).join("") + "</div>";
  }
  function sw(id, campo, on, label) {
    return '<label class="adm-sw"><input type="checkbox" data-adm="sw" data-id="' + esc(id) + '" data-campo="' + campo + '"' + (on ? " checked" : "") + '><span class="tr" aria-hidden="true"></span><span>' + label + "</span></label>";
  }
  /* ---------- Pedidos ---------- */
  function esHoy(o) {
    var z = api.zona(), f = function (d) { return new Date(d).toLocaleDateString("es-UY", { timeZone: z }); };
    return f(o.fecha) === f(Date.now());
  }
  function esActivo(o) { return o.estado === "recibido" || o.estado === "preparando"; }
  function vistaPedidos() {
    if (pedidos === null) return '<p class="hint" style="padding:30px;text-align:center">Cargando pedidos…</p>';
    var hoy = pedidos.filter(esHoy);
    var vendido = hoy.filter(function (o) { return o.estado !== "cancelado"; }).reduce(function (a, o) { return a + (o.total || 0); }, 0);
    var lista = filtroPed === "activos" ? pedidos.filter(esActivo) : filtroPed === "hoy" ? hoy : pedidos;
    var f = [["activos", "En curso"], ["hoy", "Hoy"], ["todos", "Todos"]];
    return '<div class="adm-sum"><span><b>' + hoy.length + "</b> pedidos hoy</span><span><b>" + fmt(vendido) + "</b> vendido hoy</span></div>" +
      '<div class="chips adm-cats">' + f.map(function (x) { return '<button class="chip' + (filtroPed === x[0] ? " on" : "") + '" data-adm="fped" data-v="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div>" +
      (lista.length ? '<div class="adm-list">' + lista.map(tarjetaPedido).join("") + "</div>"
        : '<div class="empty"><div class="art">' + ic("bag") + "</div><h2>" + (filtroPed === "activos" ? "Nada pendiente" : "Sin pedidos") + "</h2><p>Los pedidos que los clientes envían desde la carta aparecen acá al instante.</p></div>") +
      '<p class="hint" style="margin:14px var(--pad) 0">' + (api.nube.modo === "web" ? "Cualquier cliente puede pedir desde la carta, sin crear cuenta." : "Pueden enviar pedidos quienes abren la carta con su cuenta de Claude y permiso de Colaborador.") + ' Dejá esta pantalla abierta: avisa cuando entra uno nuevo.</p>';
  }
  function tarjetaPedido(o) {
    var z = api.zona();
    var hora = new Date(o.fecha).toLocaleString("es-UY", { hour: "2-digit", minute: "2-digit", day: esHoy(o) ? undefined : "2-digit", month: esHoy(o) ? undefined : "2-digit", timeZone: z });
    var mod = { delivery: "Delivery", retiro: "Retiro", mesa: "Mesa " + (o.mesa || "") }[o.modalidad] || "";
    var pago = { efectivo: "Efectivo", transferencia: "Transferencia", pos: "Tarjeta (POS)" }[o.pago] || "";
    var key = esc(o.uid + "|" + o.id);
    return '<article class="adm-row ped est-' + o.estado + '">' +
      '<div class="ped-head"><b>' + (o.num ? "#" + esc(o.num) + " · " : "") + hora + " · " + esc(mod) + "</b>" + '<span class="estado est-' + o.estado + '">' + esc(nombreEstado(o.estado)) + "</span></div>" +
      (o.nombre ? '<p class="ped-who">' + esc(o.nombre) + "</p>" : "") +
      (o.direccion ? '<p class="ped-who">' + ic("pin") + esc(o.direccion) + "</p>" : "") +
      (o.telefono ? '<p class="ped-who"><a href="tel:' + esc(o.telefono.replace(/[^\d+]/g, "")) + '">' + ic("whatsapp") + esc(o.telefono) + "</a></p>" : "") +
      '<ul class="ped-items">' + (o.items || []).map(function (i) {
        var op = Object.keys(i.sel || {}).map(function (k) { return i.sel[k]; }).join(", ");
        return "<li><b>" + i.qty + " ×</b> " + esc(i.nombre) + (op ? " <span>(" + esc(op) + ")</span>" : "") + (i.nota ? ' <em>“' + esc(i.nota) + "”</em>" : "") + "</li>";
      }).join("") + "</ul>" +
      '<div class="ped-foot"><span class="price">' + fmt(o.total || 0) + '</span><span class="ped-pago">' + esc(pago) + "</span></div>" +
      (o.estado === "cancelado" ? '<p class="ped-cancel">' + (o.cancelado ? "El cliente canceló este pedido" : "Pedido cancelado") + "</p>" :
      '<div class="ped-acc">' + api.estados.filter(function (e) {
        return e[0] !== "cancelado" || o.estado === "recibido"; // cancelar solo antes de prepararlo
      }).map(function (e) {
        return '<button class="chip' + (o.estado === e[0] ? " on" : "") + (e[0] === "cancelado" ? " ped-x" : "") + '" data-adm="estado" data-k="' + key + '" data-v="' + e[0] + '">' + (e[0] === "cancelado" ? "Cancelar" : e[1]) + "</button>";
      }).join("") + "</div>") + "</article>";
  }
  function nombreEstado(e) { var x = api.estados.filter(function (z) { return z[0] === e; })[0]; return x ? x[1] : e; }

  function vistaProductos() {
    var lista = todos();
    var cats = [{ id: "todo", nombre: "Todo" }].concat(api.categorias);
    var qq = q.trim().toLowerCase();
    var vis = lista.filter(function (p) {
      return (filtroCat === "todo" || p.categoria === filtroCat) && (!qq || (p.nombre + " " + p.id).toLowerCase().indexOf(qq) !== -1);
    });
    var agot = lista.filter(function (p) { return !p.disponible && !p.oculto; }).length;
    var ocul = lista.filter(function (p) { return p.oculto; }).length;
    return '<div class="adm-sum"><span><b>' + lista.length + "</b> productos</span><span><b>" + agot + "</b> agotados</span><span><b>" + ocul + "</b> ocultos</span></div>" +
      '<div class="search adm-search"><label><span class="sr-only">Buscar producto</span><input type="search" data-adm="q" placeholder="Buscar producto…" value="' + esc(q) + '"></label></div>' +
      '<div class="chips adm-cats">' + cats.map(function (c) {
        return '<button class="chip' + (filtroCat === c.id ? " on" : "") + '" data-adm="cat" data-v="' + c.id + '">' + esc(c.nombre) + "</button>";
      }).join("") + "</div>" +
      '<div class="adm-list">' + (vis.length ? vis.map(fila).join("") : '<p class="hint" style="padding:20px;text-align:center">No hay productos con ese filtro.</p>') + "</div>";
  }
  function fila(p) {
    var cambiado = Object.keys(p._c).length > 0 || p._nuevo;
    var open = abierto === p.id;
    var pv = { id: p.id, nombre: p.nombre, foto: p.foto || "" };
    return '<article class="adm-row' + (p.oculto ? " oculto" : "") + (!p.disponible ? " agotado-adm" : "") + (open ? " open" : "") + '">' +
      '<div class="adm-main">' +
      '<span class="' + api.photoCls(pv) + ' adm-thumb"' + api.lq(pv) + ">" + (p.foto ? api.media(pv) : "") + "</span>" +
      '<div class="adm-info"><b>' + esc(p.nombre) + "</b>" +
      '<span class="adm-tags">' + (p._nuevo ? '<i class="t-new">Nuevo</i>' : "") + (cambiado && !p._nuevo ? '<i class="t-mod">Editado</i>' : "") +
      (p.oculto ? '<i class="t-off">Oculto</i>' : !p.disponible ? '<i class="t-off">Agotado</i>' : "") + (p.destacado ? '<i class="t-star">Destacado</i>' : "") + "</span></div>" +
      '<label class="adm-price"><span>$</span><input inputmode="numeric" data-adm="precio" data-id="' + esc(p.id) + '" value="' + (p.precio || "") + '" aria-label="Precio de ' + esc(p.nombre) + '"></label>' +
      "</div>" +
      '<div class="adm-sws">' + sw(p.id, "disponible", p.disponible, "Disponible") + sw(p.id, "destacado", !!p.destacado, "Destacado") +
      '<button class="adm-more" data-adm="abrir" data-id="' + esc(p.id) + '" aria-expanded="' + open + '">' + (open ? "Cerrar" : "Editar") + " " + ic("chevron") + "</button></div>" +
      (open ? detalle(p) : "") + "</article>";
  }
  function detalle(p) {
    var pv = { id: p.id, nombre: p.nombre, foto: p.foto || "" };
    var conFoto = api.base().filter(function (x) { return x.foto; });
    return '<div class="adm-edit">' +
      '<div class="adm-foto"><span class="' + api.photoCls(pv) + ' adm-big"' + api.lq(pv) + ">" + (p.foto ? api.media(pv) : '<i class="sin-foto">Sin foto</i>') + "</span>" +
      '<div class="adm-foto-acc"><label class="btn-pill' + (subiendo === p.id ? " light" : "") + '"><span class="arrow">' + ic("plus") + "</span>" + (subiendo === p.id ? "Subiendo…" : "Subir foto nueva") +
      '<input type="file" accept="image/*" data-adm="subir" data-id="' + esc(p.id) + '" hidden></label>' +
      '<select class="input" data-adm="elegir-foto" data-id="' + esc(p.id) + '"><option value="">Usar otra foto de la carta…</option>' +
      conFoto.map(function (x) { return '<option value="' + esc(x.foto) + '">' + esc(x.nombre) + "</option>"; }).join("") + "</select>" +
      (p.foto ? '<button class="link" data-adm="quitar-foto" data-id="' + esc(p.id) + '">' + ic("x") + " Quitar foto</button>" : "") + "</div></div>" +
      '<label class="adm-field"><span>Nombre</span><input class="input" data-adm="txt" data-campo="nombre" data-id="' + esc(p.id) + '" value="' + esc(p.nombre) + '"></label>' +
      '<label class="adm-field"><span>Descripción</span><textarea class="textarea" rows="3" data-adm="txt" data-campo="descripcion" data-id="' + esc(p.id) + '">' + esc(p.descripcion || "") + "</textarea></label>" +
      '<div class="adm-actions">' +
      (p._nuevo ? '<button class="btn-pill light" data-adm="borrar" data-id="' + esc(p.id) + '"><span class="arrow">' + ic("trash") + "</span>Borrar producto</button>"
        : '<button class="btn-pill light" data-adm="ocultar" data-id="' + esc(p.id) + '"><span class="arrow">' + ic(p.oculto ? "check" : "x") + "</span>" + (p.oculto ? "Volver a mostrar" : "Ocultar de la carta") + "</button>" +
          (Object.keys(p._c).length ? '<button class="btn-pill light" data-adm="revertir" data-id="' + esc(p.id) + '"><span class="arrow">' + ic("back") + "</span>Deshacer cambios</button>" : "")) +
      "</div></div>";
  }
  function vistaNuevo() {
    var conFoto = api.base().filter(function (p) { return p.foto; });
    return '<form class="adm-form" data-adm="form-nuevo" novalidate>' +
      '<label class="adm-field"><span>Nombre *</span><input class="input" name="nombre" required maxlength="60" placeholder="Ej.: Torta de zanahoria"></label>' +
      '<div class="adm-2"><label class="adm-field"><span>Categoría *</span><select class="input" name="categoria">' +
      api.categorias.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nombre) + "</option>"; }).join("") + "</select></label>" +
      '<label class="adm-field"><span>Precio *</span><input class="input" name="precio" inputmode="numeric" placeholder="350"></label></div>' +
      '<label class="adm-field"><span>Descripción</span><textarea class="textarea" name="descripcion" rows="3" maxlength="240" placeholder="Qué lleva, tamaño, etc."></textarea></label>' +
      '<div class="adm-field"><span>Etiquetas</span><div class="chips wrap">' + api.filtros.map(function (f) {
        return '<label class="chip adm-chk"><input type="checkbox" name="etiquetas" value="' + esc(f) + '">' + esc(f) + "</label>";
      }).join("") + "</div></div>" +
      '<label class="adm-field"><span>Foto</span><select class="input" name="foto"><option value="">Sin foto (ilustración automática)</option>' +
      conFoto.map(function (p) { return '<option value="' + esc(p.foto) + '">Usar la foto de: ' + esc(p.nombre) + "</option>"; }).join("") + "</select></label>" +
      '<div class="adm-sws">' + '<label class="adm-sw"><input type="checkbox" name="destacado"><span class="tr"></span><span>Destacado</span></label></div>' +
      '<p class="hint err" id="adm-err" hidden></p>' +
      '<button class="btn-pill" type="submit"><span class="arrow">' + ic("plus") + "</span>Agregar a la carta</button></form>" +
      (draft.nuevos.length ? '<p class="hint" style="margin-top:16px">Productos agregados desde acá: ' + draft.nuevos.map(function (n) { return esc(n.nombre); }).join(", ") + ". Los editás en la pestaña Productos.</p>" : "");
  }
  function vistaLocal() {
    var L = draft.local, base = api.local();
    var h = L.horarios || base.horarios;
    return '<section class="adm-block"><h3>Aviso en la portada</h3>' +
      '<p class="hint">Se muestra arriba de todo en el inicio. Dejalo vacío para no mostrar nada.</p>' +
      '<textarea class="textarea" data-adm="aviso" rows="2" maxlength="140" placeholder="Ej.: Hoy cerramos a las 15:00 · Probá la sopa de calabaza">' + esc(draft.aviso) + "</textarea></section>" +
      '<section class="adm-block"><h3>WhatsApp de contacto</h3>' +
      '<div class="adm-2"><label class="adm-field"><span>Número (con 598)</span><input class="input" data-adm="wa" inputmode="numeric" value="' + esc(L.whatsapp || base.whatsapp) + '"></label>' +
      '<label class="adm-field"><span>Como se muestra</span><input class="input" data-adm="wav" value="' + esc(L.whatsappVisible || base.whatsappVisible) + '"></label></div></section>' +
      '<section class="adm-block"><h3>Horarios</h3><div class="adm-hours">' +
      [1, 2, 3, 4, 5, 6, 0].map(function (d) {
        var v = h[d];
        return '<div class="adm-day"><b>' + DIAS[d] + "</b>" +
          sw("dia-" + d, "abierto", !!v, v ? "Abierto" : "Cerrado").replace('data-adm="sw"', 'data-adm="dia" data-d="' + d + '"') +
          (v ? '<input class="input sm" type="time" data-adm="hora" data-d="' + d + '" data-i="0" value="' + v[0] + '"><span>a</span><input class="input sm" type="time" data-adm="hora" data-d="' + d + '" data-i="1" value="' + v[1] + '">' : "") +
          "</div>";
      }).join("") + "</div></section>" +
      '<section class="adm-block danger"><h3>Restaurar</h3><p class="hint">Borra todos los cambios hechos desde este panel (precios, agotados, productos nuevos, aviso, horarios) y vuelve a la carta original.</p>' +
      '<button class="btn-pill light" data-adm="reset"><span class="arrow">' + ic("trash") + "</span>Restaurar carta original</button></section>";
  }
  function barra() {
    var n = nCambios();
    if (!n) return "";
    return '<div class="cta-bar"><button class="cta" data-adm="guardar"' + (guardando ? " disabled" : "") + '><span class="cta-txt"><span class="lbl">' + (guardando ? "Guardando…" : "Guardar cambios") + "</span>" +
      '<span class="sub">' + n + " cambio" + (n === 1 ? "" : "s") + ' sin guardar · <u data-adm="descartar">Descartar</u></span></span><span class="arrow">' + ic("check") + "</span></button></div>";
  }
  function sinPermiso() {
    if (api.nube.modo === "web") return header() + '<form class="adm-login" data-adm="login"><div class="art">' + ic("store") + "</div><h2>Entrar al panel</h2>" +
      "<p>" + (api.nube.soloClave ? "Poné la contraseña del panel." : "Usá el email y la contraseña del local.") + "</p>" +
      (api.nube.soloClave ? '<input type="hidden" name="email" value="local">' : '<label class="adm-field"><span>Email</span><input class="input" name="email" type="email" autocomplete="username" required></label>') +
      '<label class="adm-field"><span>Contraseña</span><input class="input" name="pass" type="password" autocomplete="current-password" required></label>' +
      '<p class="adm-err" id="adm-login-err" hidden></p>' +
      '<button class="btn-pill" type="submit"><span class="arrow">' + ic("arrow") + "</span>Entrar</button></form>";
    return header() + '<div class="empty"><div class="art">' + ic("store") + "</div><h2>Solo para el local</h2><p>El panel de administración lo pueden usar el dueño de la carta y quienes él invite como editores.</p>" +
      '<a class="btn-pill" href="#/"><span class="arrow">' + ic("arrow") + "</span>Ver la carta</a></div>";
  }

  function pintar(keepScroll) {
    if (!root || !document.body.contains(root)) return;
    var y = window.scrollY;
    if (!api.puede()) { root.innerHTML = sinPermiso(); return; }
    root.innerHTML = header() +
      '<p class="adm-status ' + estadoClase() + '">' + esc(estadoTexto()) + "</p>" + tabs() +
      '<div class="adm-body">' + (tab === "pedidos" ? vistaPedidos() : tab === "productos" ? vistaProductos() : tab === "recomendados" ? vistaRecomendados() : tab === "nuevo" ? vistaNuevo() : vistaLocal()) + "</div>";
    var cr = document.getElementById("cta-root"); cr.innerHTML = cr._html = barra();
    document.body.classList.toggle("has-cta", nCambios() > 0);
    if (keepScroll) window.scrollTo(0, y);
  }
  function refrescarBarra() {
    // no reemplazar el botón si no cambió (si no, se pierde el toque al salir de un campo)
    var cr = document.getElementById("cta-root"), html = barra();
    if (cr._html !== html) { cr.innerHTML = html; cr._html = html; }
    document.body.classList.toggle("has-cta", nCambios() > 0);
  }
  function refrescarFila(id) {
    var art = root.querySelector('[data-adm="abrir"][data-id="' + cssEsc(id) + '"]');
    art = art && art.closest(".adm-row");
    if (!art) return;
    var p = todos().filter(function (x) { return x.id === id; })[0];
    var tmp = document.createElement("div"); tmp.innerHTML = fila(p);
    art.querySelector(".adm-tags").outerHTML = tmp.querySelector(".adm-tags").outerHTML;
    art.className = tmp.firstChild.className;
  }
  function cssEsc(s) { return String(s).replace(/["\\]/g, "\\$&"); }

  /* ---------- Eventos ---------- */
  function onClick(e) {
    if (!root || !document.body.contains(root)) return;
    var t = e.target.closest("[data-adm]");
    if (!t) return;
    var a = t.getAttribute("data-adm"), id = t.getAttribute("data-id");
    if (a === "salir") { api.logout(); return; }
    if (a === "tab") { tab = t.getAttribute("data-v"); abierto = null; pintar(); window.scrollTo(0, 0); }
    else if (a === "cat") { filtroCat = t.getAttribute("data-v"); pintar(true); }
    else if (a === "abrir") { abierto = abierto === id ? null : id; pintar(true); }
    else if (a === "ocultar") { var p = todos().filter(function (x) { return x.id === id; })[0]; setCampo(id, "oculto", !p.oculto); pintar(true); }
    else if (a === "revertir") { delete draft.productos[id]; pintar(true); }
    else if (a === "borrar") {
      draft.nuevos = draft.nuevos.filter(function (n) { return n.id !== id; });
      if (Array.isArray(draft.recomendados)) draft.recomendados = draft.recomendados.filter(function (x) { return x !== id; });
      abierto = null; pintar(true);
    }
    else if (a === "reset") {
      draft = vacio(); pintar(true); api.toast("Listo: tocá Guardar cambios para restaurar la carta original");
    }
    else if (a === "descartar") { e.preventDefault(); e.stopPropagation(); draft = clone(guardado); pintar(true); api.toast("Cambios descartados"); }
    else if (a === "guardar") { guardar(); }
    else if (a === "rec-sube" || a === "rec-baja") {
      var l = recLista(), i = l.indexOf(id), j = a === "rec-sube" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= l.length) return;
      l[i] = l[j]; l[j] = id; draft.recomendados = l; pintar(true);
    }
    else if (a === "rec-quita") { setRec(id, false); pintar(true); }
    else if (a === "fped") { filtroPed = t.getAttribute("data-v"); pintar(true); }
    else if (a === "estado") {
      var k = t.getAttribute("data-k").split("|"), o = (pedidos || []).filter(function (x) { return x.uid === k[0] && x.id === k[1]; })[0];
      if (!o) return;
      var nuevo = t.getAttribute("data-v");
      o.estado = nuevo; pintar(true);
      api.pedidos.cambiarEstado(o, nuevo).then(function () {
        if (api.nube.estado !== "nube") { pedidosLocales(); }
        api.toast("Estado: " + nombreEstado(nuevo));
      }, function () { api.toast("No se pudo cambiar el estado", 3500); });
    }
    else if (a === "quitar-foto") { setCampo(id, "foto", ""); setCampo(id, "recorte", ""); pintar(true); }
  }
  function onInput(e) {
    if (!root || !document.body.contains(root)) return;
    var t = e.target, a = t.getAttribute && t.getAttribute("data-adm");
    if (!a) return;
    var id = t.getAttribute("data-id");
    if (a === "q") { q = t.value; var pos = t.selectionStart; pintar(true); var n = root.querySelector('[data-adm="q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } return; }
    if (a === "precio") {
      t.value = t.value.replace(/\D/g, "").slice(0, 6);
      setCampo(id, "precio", Number(t.value) || 0); refrescarFila(id);
    }
    else if (a === "sw") {
      if (t.getAttribute("data-campo") === "destacado") setRec(id, t.checked); else setCampo(id, t.getAttribute("data-campo"), t.checked);
      refrescarFila(id);
    }
    else if (a === "rec-hora") { if (t.checked) delete draft.recPorHora; else draft.recPorHora = false; if (e.type === "change") pintar(true); }
    else if (a === "rec-agrega" && e.type === "change" && t.value) { setRec(t.value, true); pintar(true); }
    else if (a === "txt") { setCampo(id, t.getAttribute("data-campo"), t.value); refrescarFila(id); }
    else if (a === "aviso") { draft.aviso = t.value; }
    else if (a === "elegir-foto" && e.type === "change" && t.value) { setCampo(id, "foto", t.value); setCampo(id, "recorte", ""); pintar(true); }
    else if (a === "subir" && e.type === "change" && t.files && t.files[0]) { subirFoto(id, t.files[0]); return; }
    else if (a === "wa") { draft.local.whatsapp = t.value.replace(/\D/g, ""); if (draft.local.whatsapp === api.local().whatsapp) delete draft.local.whatsapp; }
    else if (a === "wav") { draft.local.whatsappVisible = t.value; if (t.value === api.local().whatsappVisible) delete draft.local.whatsappVisible; }
    else if (a === "dia" || a === "hora") {
      var h = draft.local.horarios || (draft.local.horarios = clone(api.local().horarios));
      var d = t.getAttribute("data-d");
      if (a === "dia") { h[d] = t.checked ? (api.local().horarios[d] || ["09:00", "18:00"]) : null; pintar(true); }
      else { h[d][Number(t.getAttribute("data-i"))] = t.value; }
      if (JSON.stringify(h) === JSON.stringify(api.local().horarios)) delete draft.local.horarios;
    }
    refrescarBarra();
  }
  function onSubmit(e) {
    if (root && document.body.contains(root) && e.target.getAttribute("data-adm") === "login") {
      e.preventDefault();
      var fl = e.target, el = root.querySelector("#adm-login-err"), bt = fl.querySelector("button");
      bt.disabled = true; el.hidden = true;
      api.login(fl.email.value.trim(), fl.pass.value).then(function () { bt.disabled = false; }, function (er) {
        bt.disabled = false; el.hidden = false;
        el.textContent = er && /wrong-password|invalid-credential|user-not-found|invalid-email/.test(er.code || "") ? (api.nube.soloClave ? "Contraseña incorrecta." : "Email o contraseña incorrectos.") :
          er && /too-many-requests/.test(er.code || "") ? "Demasiados intentos. Esperá unos minutos." : "No se pudo entrar. Revisá la conexión.";
      });
      return;
    }
    if (!root || !document.body.contains(root) || e.target.getAttribute("data-adm") !== "form-nuevo") return;
    e.preventDefault();
    var f = e.target, err = root.querySelector("#adm-err");
    var nombre = f.nombre.value.trim(), precio = Number(String(f.precio.value).replace(/\D/g, ""));
    if (!nombre || !precio) { err.textContent = !nombre ? "Poné un nombre." : "Poné un precio (solo números)."; err.hidden = false; return; }
    var base = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "producto";
    var id = base, i = 2, existe = function (x) { return todos().some(function (p) { return p.id === x; }); };
    while (existe(id)) id = base + "-" + i++;
    var etiquetas = Array.prototype.slice.call(f.querySelectorAll('input[name="etiquetas"]:checked')).map(function (c) { return c.value; });
    draft.nuevos.push({ id: id, nombre: nombre, categoria: f.categoria.value, precio: precio, descripcion: f.descripcion.value.trim(),
      etiquetas: etiquetas, foto: f.foto.value, destacado: f.destacado.checked, disponible: true });
    if (f.destacado.checked && Array.isArray(draft.recomendados)) draft.recomendados.push(id);
    tab = "productos"; filtroCat = f.categoria.value; abierto = id; q = "";
    pintar(); window.scrollTo(0, 0);
    api.toast("Agregado. Tocá Guardar cambios para publicarlo");
  }
  function achicar(file, max) {
    return new Promise(function (ok, no) {
      var img = new Image(), url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
        // recorte cuadrado centrado, como el resto de las fotos de la carta
        var lado = Math.min(img.width, img.height), sx = (img.width - lado) / 2, sy = (img.height - lado) / 2, out = Math.min(max, lado);
        c.width = c.height = out;
        var cx = c.getContext("2d");
        cx.filter = "sepia(.12) saturate(.9) contrast(.94) brightness(1.03)"; // mismo retoque cálido que el resto de la carta
        cx.drawImage(img, sx, sy, lado, lado, 0, 0, out, out);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok({ blob: b, canvas: c }) : no(); }, "image/webp", .8);
      };
      img.onerror = function () { URL.revokeObjectURL(url); no(); };
      img.src = url;
    });
  }
  function subirFoto(id, file) {
    subiendo = id; pintar(true);
    var fin = function (msg) { subiendo = null; pintar(true); if (msg) api.toast(msg, 3500); };
    api.assets().then(function (assets) {
      return achicar(file, 900).then(function (r) {
        if (assets && assets.subirFoto) return assets.subirFoto(r.canvas);
        if (assets) return assets.upload(r.blob).then(function (res) { return "/_blob/" + res.id; });
        return r.canvas.toDataURL("image/jpeg", .7); // modo prueba: queda en este dispositivo
      });
    }).then(function (src) {
      setCampo(id, "foto", src); setCampo(id, "recorte", "");
      fin("Foto lista. Tocá Guardar cambios para publicarla");
    }, function () { fin("No se pudo subir la foto. Probá con otra imagen"); });
  }
  function pedidosLocales() { if (cortarPedidos) cortarPedidos(); cortarPedidos = api.pedidos.escucharTodos(alLlegarPedidos); }
  var vistos = null;
  function alLlegarPedidos(lista) {
    if (lista === null) { pedidos = []; pintarSiPedidos(); return; }
    var nuevos = vistos ? lista.filter(function (o) { return !vistos[o.uid + o.id]; }) : [];
    vistos = {}; lista.forEach(function (o) { vistos[o.uid + o.id] = 1; });
    pedidos = lista;
    if (nuevos.length) {
      api.toast("🔔 Pedido nuevo" + (nuevos.length > 1 ? "s (" + nuevos.length + ")" : "") + ": " + fmt(nuevos[0].total || 0), 5000);
      try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) { /* */ }
    }
    pintarSiPedidos();
  }
  function pintarSiPedidos() {
    if (!root || !document.body.contains(root)) return;
    var tb = root.querySelector(".adm-tabs");
    if (tb) { var tmp = document.createElement("div"); tmp.innerHTML = tabs(); tb.outerHTML = tmp.innerHTML; }
    if (tab === "pedidos") { var body = root.querySelector(".adm-body"); if (body) body.innerHTML = vistaPedidos(); }
  }

  function guardar() {
    if (guardando || !nCambios()) return;
    guardando = true; refrescarBarra();
    var datos = limpiar(draft);
    api.guardar(datos).then(function () {
      guardando = false; guardado = clone(draft);
      pintar(true);
      api.toast(api.nube.estado === "nube" ? "Guardado. Los clientes ya ven los cambios" : "Guardado en este dispositivo (modo prueba)");
    }, function (e) {
      guardando = false; refrescarBarra();
      api.toast(e && e.code === "invalid_argument" ? "No tenés permiso para guardar cambios" : "No se pudo guardar. Probá de nuevo", 4000);
    });
  }
  window.addEventListener("beforeunload", function (e) { if (sucio()) { e.preventDefault(); e.returnValue = ""; } });

  var escuchando = false;
  window.RCAdmin = {
    mount: function (el, A) {
      api = A; root = el; esc = A.esc; ic = A.ic; fmt = A.fmt;
      if (!draft || !sucio()) { guardado = normalizar(A.ajustes()); draft = clone(guardado); }
      if (!escuchando) {
        document.addEventListener("click", onClick);
        document.addEventListener("input", onInput);
        document.addEventListener("change", onInput);
        document.addEventListener("submit", onSubmit, true);
        escuchando = true;
      }
      // (re)conectar la lista de pedidos si cambió el modo (prueba → nube)
      if (A.puede() && (!cortarPedidos || modoPed !== A.nube.estado)) { modoPed = A.nube.estado; vistos = null; pedidos = null; pedidosLocales(); }
      pintar();
    },
    sucio: sucio,
    // llegaron cambios guardados desde otro dispositivo mientras se edita
    nuevaBase: function () { guardado = normalizar(api.ajustes()); refrescarBarra(); }
  };
})();
