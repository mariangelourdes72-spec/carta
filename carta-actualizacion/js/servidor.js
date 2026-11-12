/* Conexión con el servidor propio (server.js). Imita la parte de Firebase que usa la app:
   db.doc(ruta).get/set/onSnapshot, db.collection(c).doc()/onSnapshot y un auth mínimo. */
(function () {
  function azar(n) {
    var a = new Uint8Array(n), s = "", c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < n; i++) s += c[a[i] % c.length];
    return s;
  }
  function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }

  window.RCServidor = function () {
    var uid = leer("rc_uid");
    if (!uid || !/^[A-Za-z0-9_-]{16,64}$/.test(uid)) { uid = azar(24); guardar("rc_uid", uid); }
    var token = leer("rc_admin");
    var oyentes = [], authCbs = [], es = null;

    function headers(extra) {
      var h = { "X-Uid": uid };
      if (token) h.Authorization = "Bearer " + token;
      for (var k in extra) h[k] = extra[k];
      return h;
    }
    function pedir(metodo, url, cuerpo) {
      return fetch(url, { method: metodo, headers: headers(cuerpo ? { "Content-Type": "application/json" } : {}), body: cuerpo ? JSON.stringify(cuerpo) : undefined })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok) throw { code: r.status === 403 ? "permission-denied" : r.status === 401 ? "auth/invalid-credential" : r.status === 429 ? "auth/too-many-requests" : "unavailable", status: r.status };
            return d;
          });
        });
    }
    function snapDoc(id, d) { return { id: id, exists: !!d.exists, data: function () { return d.data ? JSON.parse(JSON.stringify(d.data)) : undefined; } }; }

    var modo = "sse", version = null;
    function conectarEventos() {
      if (es) es.close();
      es = null;
      if (modo !== "sse" || !window.EventSource) return;
      es = new EventSource("/api/eventos?uid=" + encodeURIComponent(uid) + (token ? "&t=" + encodeURIComponent(token) : ""));
      var primera = true;
      es.onopen = function () { if (!primera) oyentes.forEach(function (o) { o.traer(); }); primera = false; };
      es.onmessage = function (e) {
        var p; try { p = JSON.parse(e.data).path; } catch (x) { return; }
        oyentes.forEach(function (o) { if (o.toca(p)) o.traer(); });
      };
    }
    // Netlify (sin conexión en vivo): pregunta cada pocos segundos si hubo cambios
    function revisarCambios() {
      if (document.hidden) return;
      pedir("GET", "/api/cambios?desde=" + (version || 0)).then(function (d) {
        if (version === null) { version = d.v; return; }
        if (d.v === version) return;
        version = d.v;
        oyentes.forEach(function (o) { if (!d.paths || d.paths.some(o.toca)) o.traer(); });
      }, function () {});
    }
    setInterval(function () {
      if (modo === "poll") revisarCambios();
      else if (!es || es.readyState !== 1) oyentes.forEach(function (o) { o.traer(); }); // respaldo si se corta lo en vivo
    }, 12000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden && modo === "poll") revisarCambios(); });

    function escuchar(toca, traer) {
      var o = { toca: toca, traer: traer };
      oyentes.push(o); traer();
      return function () { var i = oyentes.indexOf(o); if (i > -1) oyentes.splice(i, 1); };
    }

    function doc(ruta) {
      var id = ruta.split("/").pop();
      return {
        id: id,
        get: function () { return pedir("GET", "/api/doc/" + ruta).then(function (d) { return snapDoc(id, d); }); },
        set: function (v) { return pedir("PUT", "/api/doc/" + ruta, v); },
        onSnapshot: function (ok, err) {
          return escuchar(function (p) { return p === ruta; }, function () {
            pedir("GET", "/api/doc/" + ruta).then(function (d) { ok(snapDoc(id, d)); }, function (e) { if (err) err(e); });
          });
        }
      };
    }
    function collection(c) {
      return {
        doc: function (id) { return doc(c + "/" + (id || azar(20))); },
        onSnapshot: function (ok, err) {
          return escuchar(function (p) { return p.indexOf(c + "/") === 0; }, function () {
            pedir("GET", "/api/col/" + c).then(function (d) {
              ok({ docs: d.docs.map(function (x) { return snapDoc(x.id, { exists: true, data: x.data }); }) });
            }, function (e) { if (err) err(e); });
          });
        }
      };
    }

    function usuario() { return { uid: uid, isAnonymous: !token }; }
    function avisarAuth() { conectarEventos(); authCbs.forEach(function (f) { f(usuario()); }); }
    var auth = {
      onAuthStateChanged: function (f) { authCbs.push(f); setTimeout(function () { f(usuario()); }, 0); },
      signInAnonymously: function () { return Promise.resolve(); },
      signInWithEmailAndPassword: function (email, pass) {
        return pedir("POST", "/api/login", { password: pass }).then(function (d) { token = d.token; guardar("rc_admin", token); avisarAuth(); });
      },
      signOut: function () { token = null; guardar("rc_admin", null); avisarAuth(); return Promise.resolve(); }
    };

    // modo de actualización y, si la sesión del dueño venció, se descarta
    pedir("GET", "/api/yo").then(function (d) {
      modo = d.modo === "poll" ? "poll" : "sse";
      if (modo === "poll") revisarCambios(); else conectarEventos();
      if (token && !d.admin) { token = null; guardar("rc_admin", null); avisarAuth(); }
    }, function () { conectarEventos(); });
    return { auth: auth, db: { doc: doc, collection: collection } };
  };
})();
