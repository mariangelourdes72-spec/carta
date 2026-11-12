/* Servidor de la carta (Railway u otro hosting con Node).
   Sirve la página y guarda pedidos, cambios del panel y fotos en un archivo JSON.
   Variables:
     ADMIN_PASSWORD  contraseña del panel (obligatoria)
     DATA_DIR        carpeta donde se guarda data.json (en Railway: un Volume montado en /data)
     PORT            la pone Railway sola */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(ROOT, ".data");
const DATA_FILE = path.join(DATA_DIR, "data.json");
const PASS = process.env.ADMIN_PASSWORD || "";
const SECRET = crypto.createHash("sha256").update("rc|" + PASS).digest();

/* ---------- Datos ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let DOCS = {};
try { DOCS = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch (e) { DOCS = {}; }
let guardando = null;
function persistir() {
  if (guardando) return;
  guardando = setTimeout(() => {
    guardando = null;
    const tmp = DATA_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(DOCS));
    fs.renameSync(tmp, DATA_FILE);
  }, 150);
}

/* ---------- Permisos (los mismos que tenía la versión en Claude) ---------- */
const UID_OK = /^[A-Za-z0-9_-]{16,64}$/;
function puedeLeer(p, quien) {
  const [col, id] = p.split("/");
  if (col === "carta" || col === "fotos") return true;
  if (col === "pedidos" || col === "estados") return quien.admin || (id && id === quien.uid);
  return false;
}
function puedeEscribir(p, quien, valor) {
  const [col, id] = p.split("/");
  if (col === "carta" || col === "fotos" || col === "estados") return quien.admin;
  if (col === "pedidos") return id === quien.uid && valor && Array.isArray(valor.lista) && valor.lista.length <= 30;
  return false;
}
const pathOk = (p) => /^(carta|fotos|pedidos|estados)(\/[A-Za-z0-9_-]{1,64})?$/.test(p);

/* ---------- Sesión del dueño ---------- */
function firmar(exp) { return exp + "." + crypto.createHmac("sha256", SECRET).update(String(exp)).digest("base64url"); }
function tokenOk(t) {
  if (!t || !PASS) return false;
  const [exp] = String(t).split(".");
  if (!(Number(exp) > Date.now())) return false;
  const a = Buffer.from(firmar(exp)), b = Buffer.from(String(t));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function quien(req) {
  const uid = req.headers["x-uid"];
  const auth = (req.headers.authorization || "").replace(/^Bearer /, "");
  return { uid: UID_OK.test(uid || "") ? uid : null, admin: tokenOk(auth) };
}
const intentos = new Map();

/* ---------- Tiempo real (Server-Sent Events) ---------- */
const clientes = new Set();
function avisar(p) {
  const msg = "data: " + JSON.stringify({ path: p }) + "\n\n";
  for (const c of clientes) if (puedeLeer(p, c.quien)) c.res.write(msg);
}
setInterval(() => { for (const c of clientes) c.res.write(": ping\n\n"); }, 25000);

/* ---------- Utilidades HTTP ---------- */
function json(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
}
function leerCuerpo(req, max) {
  return new Promise((ok, no) => {
    let n = 0; const partes = [];
    req.on("data", (c) => { n += c.length; if (n > max) { no(new Error("grande")); req.destroy(); } else partes.push(c); });
    req.on("end", () => { try { ok(partes.length ? JSON.parse(Buffer.concat(partes).toString("utf8")) : {}); } catch (e) { no(e); } });
    req.on("error", no);
  });
}
const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".json": "application/json", ".woff2": "font/woff2" };
const PRIVADO = /^\/(server\.js|package\.json|\.data|data|firestore\.rules|firebase\.json|\.firebaserc|README\.md)/;

async function api(req, res, url) {
  const q = quien(req);
  const ruta = url.pathname.slice(5); // sin "/api/"

  if (ruta === "login" && req.method === "POST") {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const r = intentos.get(ip) || { n: 0, t: Date.now() };
    if (Date.now() - r.t > 10 * 60000) { r.n = 0; r.t = Date.now(); }
    if (r.n >= 10) return json(res, 429, { error: "too-many-requests" });
    const body = await leerCuerpo(req, 2000);
    const a = Buffer.from(String(body.password || "")), b = Buffer.from(PASS);
    if (!PASS || a.length !== b.length || !crypto.timingSafeEqual(a, b)) { r.n++; intentos.set(ip, r); return json(res, 401, { error: "invalid-credential" }); }
    intentos.delete(ip);
    return json(res, 200, { token: firmar(Date.now() + 90 * 24 * 3600 * 1000) });
  }
  if (ruta === "yo") return json(res, 200, { admin: q.admin, modo: "sse" });

  if (ruta === "eventos") {
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
    res.write("retry: 3000\n\n");
    const c = { res, quien: { uid: UID_OK.test(url.searchParams.get("uid") || "") ? url.searchParams.get("uid") : null, admin: tokenOk(url.searchParams.get("t")) } };
    clientes.add(c);
    req.on("close", () => clientes.delete(c));
    return;
  }

  // /api/doc/<col>/<id>  y  /api/col/<col>
  const m = /^(doc|col)\/(.+)$/.exec(ruta);
  if (!m || !pathOk(m[2])) return json(res, 404, { error: "not-found" });
  const p = m[2];
  if (m[1] === "col") {
    if (p.includes("/") || req.method !== "GET") return json(res, 400, {});
    const pref = p + "/";
    const docs = Object.keys(DOCS).filter((k) => k.startsWith(pref) && puedeLeer(k, q)).map((k) => ({ id: k.slice(pref.length), data: DOCS[k] }));
    if ((p === "pedidos" || p === "estados") && !q.admin) return json(res, 403, { error: "permission-denied" });
    return json(res, 200, { docs });
  }
  if (!p.includes("/")) return json(res, 400, {});
  if (req.method === "GET") {
    if (!puedeLeer(p, q)) return json(res, 403, { error: "permission-denied" });
    return json(res, 200, { exists: p in DOCS, data: DOCS[p] || null });
  }
  if (req.method === "PUT") {
    let body;
    try { body = await leerCuerpo(req, p.startsWith("fotos/") ? 1.5e6 : 6e5); } catch (e) { return json(res, 413, { error: "too-large" }); }
    if (!puedeEscribir(p, q, body)) return json(res, 403, { error: "permission-denied" });
    DOCS[p] = body; persistir(); avisar(p);
    return json(res, 200, { ok: true });
  }
  return json(res, 405, {});
}

function estatico(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === "/") rel = "/index.html";
  if (PRIVADO.test(rel) || rel.includes("..")) { res.writeHead(404); return res.end(); }
  const f = path.join(ROOT, rel);
  fs.stat(f, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return fs.createReadStream(path.join(ROOT, "404.html")).on("error", () => res.end()).pipe(res);
    }
    const ext = path.extname(f).toLowerCase();
    res.writeHead(200, {
      "Content-Type": TIPOS[ext] || "application/octet-stream",
      "Cache-Control": rel.startsWith("/fotos/") ? "public, max-age=604800" : "no-cache"
    });
    fs.createReadStream(f).pipe(res);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname.startsWith("/api/")) {
    api(req, res, url).catch(() => { if (!res.headersSent) json(res, 500, { error: "server" }); });
  } else estatico(req, res, url);
}).listen(PORT, () => console.log("Carta en el puerto " + PORT + (PASS ? "" : " — FALTA ADMIN_PASSWORD")));
