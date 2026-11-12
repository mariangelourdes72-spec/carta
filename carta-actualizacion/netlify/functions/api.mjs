// Datos de la carta en Netlify (Netlify Blobs): mismas reglas que server.js.
// Variable necesaria en Netlify: ADMIN_PASSWORD
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const config = { path: "/api/*" };

const PASS = process.env.ADMIN_PASSWORD || "";
const SECRET = crypto.createHash("sha256").update("rc|" + PASS).digest();
const UID_OK = /^[A-Za-z0-9_-]{16,64}$/;
const pathOk = (p) => /^(carta|fotos|pedidos|estados)(\/[A-Za-z0-9_-]{1,64})?$/.test(p);
const store = () => getStore({ name: "carta", consistency: "strong" });

function puedeLeer(p, q) {
  const [col, id] = p.split("/");
  if (col === "carta" || col === "fotos") return true;
  if (col === "pedidos" || col === "estados") return q.admin || (id && id === q.uid);
  return false;
}
function puedeEscribir(p, q, v) {
  const [col, id] = p.split("/");
  if (col === "carta" || col === "fotos" || col === "estados") return q.admin;
  if (col === "pedidos") return id === q.uid && v && Array.isArray(v.lista) && v.lista.length <= 30;
  return false;
}
function firmar(exp) { return exp + "." + crypto.createHmac("sha256", SECRET).update(String(exp)).digest("base64url"); }
function tokenOk(t) {
  if (!t || !PASS) return false;
  const [exp] = String(t).split(".");
  if (!(Number(exp) > Date.now())) return false;
  const a = Buffer.from(firmar(exp)), b = Buffer.from(String(t));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const json = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

// registro de cambios, para que los navegadores sepan qué volver a pedir
async function anotarCambio(s, p) {
  const log = (await s.get("_cambios", { type: "json" })) || { v: 0, lista: [] };
  log.v += 1;
  log.lista.push({ v: log.v, path: p });
  if (log.lista.length > 200) log.lista = log.lista.slice(-200);
  await s.setJSON("_cambios", log);
}

export default async (req) => {
  const url = new URL(req.url);
  const ruta = url.pathname.replace(/^\/api\//, "");
  const uid = req.headers.get("x-uid");
  const q = { uid: UID_OK.test(uid || "") ? uid : null, admin: tokenOk((req.headers.get("authorization") || "").replace(/^Bearer /, "")) };
  const s = store();

  if (ruta === "yo") return json(200, { admin: q.admin, modo: "poll" });

  if (ruta === "login" && req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const a = Buffer.from(String(body.password || "")), b = Buffer.from(PASS);
    if (!PASS || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      await new Promise((r) => setTimeout(r, 800)); // frena intentos por fuerza bruta
      return json(401, { error: "invalid-credential" });
    }
    return json(200, { token: firmar(Date.now() + 90 * 24 * 3600 * 1000) });
  }

  if (ruta === "cambios") {
    const log = (await s.get("_cambios", { type: "json" })) || { v: 0, lista: [] };
    const desde = Number(url.searchParams.get("desde") || 0);
    const nuevos = log.lista.filter((c) => c.v > desde);
    const completo = !log.lista.length || log.lista[0].v <= desde + 1;
    return json(200, { v: log.v, paths: completo ? [...new Set(nuevos.map((c) => c.path).filter((p) => puedeLeer(p, q)))] : null });
  }

  const m = /^(doc|col)\/(.+)$/.exec(ruta);
  if (!m || !pathOk(m[2])) return json(404, { error: "not-found" });
  const p = m[2];

  if (m[1] === "col") {
    if (p.includes("/") || req.method !== "GET") return json(400, {});
    if ((p === "pedidos" || p === "estados") && !q.admin) return json(403, { error: "permission-denied" });
    const { blobs } = await s.list({ prefix: p + "/" });
    const docs = await Promise.all(blobs.map(async (bl) => ({ id: bl.key.slice(p.length + 1), data: await s.get(bl.key, { type: "json" }) })));
    return json(200, { docs: docs.filter((d) => d.data != null) });
  }
  if (!p.includes("/")) return json(400, {});
  if (req.method === "GET") {
    if (!puedeLeer(p, q)) return json(403, { error: "permission-denied" });
    const data = await s.get(p, { type: "json" });
    return json(200, { exists: data != null, data: data ?? null });
  }
  if (req.method === "PUT") {
    const txt = await req.text();
    if (txt.length > (p.startsWith("fotos/") ? 1.5e6 : 6e5)) return json(413, { error: "too-large" });
    let body; try { body = JSON.parse(txt); } catch (e) { return json(400, {}); }
    if (!puedeEscribir(p, q, body)) return json(403, { error: "permission-denied" });
    await s.setJSON(p, body);
    await anotarCambio(s, p);
    return json(200, { ok: true });
  }
  return json(405, {});
};
