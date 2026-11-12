# El Rinconcito San Nicolás — carta web

App web mobile-first (390 px base, responsive hasta desktop) para ver la carta de la cafetería,
armar pedidos (delivery, retiro o en la mesa) y administrar el local desde un panel.
HTML + CSS + JavaScript puro: **sin dependencias, sin build, sin frameworks**.

## Cómo verla en tu computadora

```bash
cd rinconcito
python3 -m http.server 8000
```

Abrí `http://localhost:8000`. Fuera de Claude la app arranca en **modo prueba** (ver más abajo).

**Mesa por QR:** un QR por mesa apuntando a `https://TU-DOMINIO/?mesa=4` deja el pedido en
"En la mesa" con el número precargado (en mesa no se ofrece pago con POS).

## Archivos

| Archivo | Qué tiene |
|---|---|
| `netlify/functions/api.mjs` | Lo mismo que `server.js`, para Netlify (datos en Netlify Blobs) |
| `server.js` | Servidor (Node, sin dependencias): sirve la carta y guarda pedidos/panel/fotos |
| `js/servidor.js` | Conexión del navegador con `server.js` (en vivo) |
| `js/firebase-config.js` | Datos de Firebase (opcional, sin uso) |
| `firestore.rules` | Reglas de seguridad de la base de datos (pegar en la consola de Firebase) |
| `index.html` | Página única. Carga los scripts en este orden: `firebase-config`, `servidor`, `carta`, `lqip`, `ilustraciones`, `admin`, `app` |
| `js/carta.js` | **La carta**: productos, precios, categorías, horarios, WhatsApp, venta cruzada y orden según la hora (`MOMENTOS`) |
| `js/app.js` | Toda la app: rutas, pantallas, carrito, pedidos, conexión con la base de datos (`NUBE`, `Pedidos`) |
| `js/admin.js` | Panel de administración (`#/admin`) |
| `js/lqip.js` | Vistas previas borrosas de las fotos (se generan, no se editan a mano) |
| `js/ilustraciones.js` | Ilustración automática para productos sin foto |
| `css/styles.css` | Estilos (paleta café/dorado, Instrument Serif + Instrument Sans, botones "Liquid Glass") |
| `fotos/` | Fotos WebP: `fotos/<id>.webp` (~820 px), `fotos/sm/<id>.webp` (440 px), `fotos/recortes/` (sin fondo) |
| `404.html` | Redirección para hostings estáticos |

## Editar la carta

Todo está en **`js/carta.js`**: nombre, descripción, precio, categoría, etiquetas, opciones, ingredientes,
alérgenos, `disponible` (false = "Agotado") y `destacado` (aparece en "Lo que recomienda la casa").
Si la descripción incluye "Consultá", el producto muestra "Consultar por WhatsApp".

Además, el dueño puede cambiar precios, disponibilidad, fotos, recomendados, aviso y horarios desde el
**panel** sin tocar código. Esos cambios se guardan como "ajustes" en la base de datos y se aplican
encima de `carta.js` (función `aplicarAjustes` en `app.js`).

## Pantallas

| Ruta | Pantalla |
|---|---|
| `#/` | Inicio: buscador, categorías, carrusel, recomendados |
| `#/categoria/cafeteria` | Listado por categoría |
| `#/producto/flat-white` | Detalle con opciones, cantidad y aclaraciones |
| `#/pedido` | Carrito, modalidad, forma de pago, envío y "Mis pedidos" con su estado |
| `#/favoritos` | Favoritos |
| `#/local` | Horarios, cómo llegar, contacto. Al final, enlace "Administración" (solo para el dueño) |
| `#/admin` | Panel: Pedidos · Productos · Recomendados · Nuevo · Local y aviso |
| cualquier otra | 404 "Acá no hay nada" |

Las rutas las maneja la propia app (variable `RUTA` + pila `PILA` en `app.js`), sin tocar `location.hash`.

## Pedidos

Los pedidos **no van por WhatsApp**: se guardan en la base de datos y le aparecen al local en el panel,
en tiempo real. Estados: **Recibido → En preparación → Enviado**, o **Cancelado**
(el cliente o el local solo pueden cancelar mientras está en "Recibido").

Estructura de datos:

```
carta/ajustes          → cambios hechos desde el panel (precios, fotos, recomendados, aviso, horarios)
pedidos/<uid-cliente>  → { lista: [ ...pedidos de ese cliente ] }   (lo escribe el cliente)
estados/<uid-cliente>  → { <idPedido>: "preparando" | "enviado" | "cancelado" }   (lo escribe el local)
```

Reglas de acceso: todos leen `carta/ajustes`; solo el dueño la escribe. Cada cliente lee y escribe solo su
`pedidos/<uid>` y lee su `estados/<uid>`. El dueño lee todo y escribe `estados`.

## Dónde se guarda

La app detecta sola dónde está corriendo (`conectarNube()` en `app.js`):

- **Dentro de Claude** (artefacto): usa la base de datos y las cuentas de Claude.
- **Con el servidor propio** (`server.js`, por ejemplo en Railway): pedidos, cambios del panel y fotos
  se guardan en `DATA_DIR/data.json`. Los clientes piden sin crear cuenta; el dueño entra a
  `https://SU-DIRECCION/#/admin` con la contraseña `ADMIN_PASSWORD`. Actualización en vivo por
  Server-Sent Events. Sin dependencias: solo Node 18+.
- **Hosting estático sin servidor**: modo prueba, todo queda en `localStorage` del dispositivo.
- (Opcional) Firebase: renombrar `FIREBASE_CONFIG_SIN_USO` en `js/firebase-config.js` y usar `firestore.rules`.

### Publicar en Netlify (gratis, recomendado)

1. Subir esta carpeta a un repositorio de GitHub (los archivos en la raíz).
2. Netlify → Add new project → Import from GitHub → elegir el repositorio → Deploy.
3. Project configuration → Environment variables → agregar **`ADMIN_PASSWORD`** → volver a publicar
   (Deploys → Trigger deploy).

Los datos se guardan en Netlify Blobs (`netlify/functions/api.mjs`). El panel ve los pedidos nuevos
en unos 10–15 segundos.

### Publicar en Railway

1. New Project → **Deploy from GitHub repo** → elegir este repositorio.
2. En el servicio → Settings → Source: **Root Directory** `rinconcito` (y la rama que corresponda).
3. Variables → agregar **`ADMIN_PASSWORD`** con la contraseña del panel.
4. Agregar un **Volume** al servicio con Mount Path **`/data`** (para que los pedidos no se borren al
   actualizar). El servidor lo detecta solo.
5. Settings → Networking → **Generate Domain**. Esa es la dirección de la carta.

QR por mesa: `https://SU-DIRECCION/?mesa=4`.

Carrito, favoritos y datos del cliente se guardan en `localStorage` del dispositivo.
