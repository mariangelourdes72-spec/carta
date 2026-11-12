/* =====================================================================
   CARTA — El Rinconcito San Nicolás
   ---------------------------------------------------------------------
   Este es el ÚNICO archivo que hay que tocar para cambiar la carta.

   Cada producto tiene:
     id           identificador único, sin espacios ni tildes (se usa en la URL)
     nombre       nombre visible
     descripcion  texto del producto
     precio       número en pesos uruguayos, SIN puntos (1490, no 1.490)
     categoria    cafeteria | desayunos | entradas | cocina | bebidas
     etiquetas    ["Sin gluten", "Veggie", "Proteico", "Sin azúcar",
                   "Frío", "Para compartir", "+18"]
     opciones     grupos de opciones obligatorias (ver LECHE y GUARNICION)
                  Una opción con recargo se escribe { nombre: "Vegetal", recargo: 60 }
     ingredientes lista de ingredientes (opcional)
     alergenos    ["Gluten", "Lácteos", "Huevo", ...]
     libreDe      ["Gluten", "Azúcar agregada", ...]
     disponible   false = se muestra como "Agotado" y no se puede pedir
     destacado    true = aparece en "Lo que recomienda la casa"
     foto         ruta a una foto real, ej. "fotos/flat-white.webp" (JPG también sirve)
                  Opcional: una versión chica de ~440 px en fotos/sm/ con el mismo nombre
                  (si queda vacío se dibuja una ilustración automática)
     recorte      (opcional) foto sin fondo en PNG/WebP para "Lo que recomienda la casa"
   ===================================================================== */

/* ---------- Grupos de opciones reutilizables ---------- */

var LECHE = {
  grupo: "Leche",
  opciones: ["Común", { nombre: "Vegetal", recargo: 60 }]
};

var GUARNICION = {
  grupo: "Guarnición",
  opciones: ["Ensalada", "Papas", "Verduras asadas", "Puré"]
};

/* ---------- Datos del local ---------- */

var LOCAL = {
  nombre: "El Rinconcito San Nicolás",
  ciudad: "Montevideo, Uruguay",
  whatsapp: "59899901399",          // formato internacional, sin + ni espacios
  whatsappVisible: "099 901 399",
  instagram: "rinconcitosannicolas_uy",
  mapsQuery: "El Rinconcito San Nicolás, Montevideo, Uruguay",
  zonaHoraria: "America/Montevideo",
  // Fotos del lugar (pantalla "El local")
  fotos: [
    { src: "fotos/local-exterior.webp", texto: "El local" },
    { src: "fotos/local-deck.webp",     texto: "La terraza" },
    { src: "fotos/local-vista.webp",    texto: "Con vista al verde" },
    { src: "fotos/local-living.webp",   texto: "El living" },
    { src: "fotos/local-vitrina.webp",  texto: "La vitrina" },
    { src: "fotos/local-barra.webp",    texto: "Café de especialidad" }
  ],
  // 0 = domingo, 1 = lunes ... 6 = sábado. null = cerrado
  horarios: {
    0: null,
    1: ["09:00", "18:30"],
    2: ["09:00", "18:30"],
    3: ["09:00", "18:30"],
    4: ["09:00", "18:30"],
    5: ["09:00", "18:30"],
    6: ["10:00", "16:00"]
  }
};

/* ---------- Categorías (en el orden en que se muestran) ---------- */

var CATEGORIAS = [
  { id: "cafeteria", nombre: "Cafetería", bajada: "Café de especialidad y té" },
  { id: "desayunos", nombre: "Desayunos", bajada: "Desayunos y meriendas" },
  { id: "entradas",  nombre: "Entradas",  bajada: "Para empezar o compartir" },
  { id: "cocina",    nombre: "Cocina",    bajada: "Los platos de la casa" },
  { id: "bebidas",   nombre: "Bebidas",   bajada: "Frías, jugos y vinos" }
];

/* ---------- Productos ---------- */

var PRODUCTOS = [

  /* ===== CAFETERÍA ===== */
  { id: "americano", foto: "fotos/americano.webp", nombre: "Americano", precio: 160, categoria: "cafeteria",
    descripcion: "Café filtrado, largo.",
    ingredientes: ["Café de especialidad", "Agua"] },

  { id: "expresso", foto: "fotos/expresso.webp", nombre: "Expresso", precio: 140, categoria: "cafeteria",
    descripcion: "Simple, corto e intenso.",
    ingredientes: ["Café de especialidad"] },

  { id: "expresso-doble", foto: "fotos/expresso-doble.webp", nombre: "Expresso doble", precio: 160, categoria: "cafeteria",
    descripcion: "Doble carga para arrancar el día.",
    ingredientes: ["Café de especialidad"] },

  { id: "capuchino", foto: "fotos/capuchino.webp", nombre: "Capuchino", precio: 190, categoria: "cafeteria",
    descripcion: "Espresso, leche y espuma.",
    opciones: [LECHE],
    ingredientes: ["Espresso", "Leche", "Espuma de leche"],
    alergenos: ["Lácteos"] },

  { id: "cortado", foto: "fotos/cortado.webp", nombre: "Cortado", precio: 180, categoria: "cafeteria",
    descripcion: "Espresso con un toque de leche.",
    opciones: [LECHE],
    ingredientes: ["Espresso", "Leche"],
    alergenos: ["Lácteos"] },

  { id: "latte", foto: "fotos/latte.webp", nombre: "Latte", precio: 190, categoria: "cafeteria",
    descripcion: "Suave y largo, con leche texturada.",
    opciones: [LECHE],
    ingredientes: ["Espresso", "Leche texturada"],
    alergenos: ["Lácteos"] },

  { id: "flat-white", recorte: "fotos/recortes/flat-white.webp", foto: "fotos/flat-white.webp", nombre: "Flat White", precio: 190, categoria: "cafeteria",
    descripcion: "Doble ristretto con leche sedosa.",
    opciones: [LECHE],
    ingredientes: ["Doble ristretto", "Leche texturada"],
    alergenos: ["Lácteos"], destacado: true },

  { id: "caramel-machiatto", foto: "fotos/caramel-machiatto.webp", nombre: "Caramel Machiatto", precio: 210, categoria: "cafeteria",
    descripcion: "Con caramelo y leche texturada.",
    opciones: [LECHE],
    ingredientes: ["Espresso", "Caramelo", "Leche texturada"],
    alergenos: ["Lácteos"] },

  { id: "cafe-frappe", foto: "fotos/cafe-frappe.webp", nombre: "Café frappe", precio: 210, categoria: "cafeteria",
    descripcion: "Frío y batido. Consultá los sabores del día.",
    opciones: [LECHE], etiquetas: ["Frío"],
    ingredientes: ["Espresso", "Leche", "Hielo"],
    alergenos: ["Lácteos"], destacado: true },

  { id: "matcha-latte", foto: "fotos/matcha-latte.webp", nombre: "Matcha Latte", precio: 280, categoria: "cafeteria",
    descripcion: "Té verde matcha con leche.",
    opciones: [LECHE],
    ingredientes: ["Té verde matcha", "Leche"],
    alergenos: ["Lácteos"] },

  { id: "submarino", foto: "fotos/submarino.webp", nombre: "Submarino", precio: 210, categoria: "cafeteria",
    descripcion: "Leche caliente con barra de chocolate.",
    opciones: [LECHE],
    ingredientes: ["Leche caliente", "Barra de chocolate"],
    alergenos: ["Lácteos"] },

  { id: "te", foto: "fotos/te.webp", nombre: "Té", precio: 110, categoria: "cafeteria",
    descripcion: "Consultá los sabores disponibles." },

  /* ===== DESAYUNOS ===== */
  { id: "toston-clasico", recorte: "fotos/recortes/toston-clasico.webp", foto: "fotos/toston-clasico.webp", nombre: "Tostón clásico", precio: 470, categoria: "desayunos",
    descripcion: "Pan de campo, queso crema o hummus, huevos revueltos, palta en lámina y tomates secos.",
    opciones: [{ grupo: "Base", opciones: ["Queso crema", "Hummus"] }],
    ingredientes: ["Pan de campo", "Queso crema o hummus", "Huevos revueltos", "Palta", "Tomates secos"],
    alergenos: ["Gluten", "Huevo", "Lácteos", "Sésamo"], destacado: true },

  { id: "toston-casa-1", foto: "fotos/toston-casa-1.webp", nombre: "Tostón de la casa 1", precio: 470, categoria: "desayunos",
    descripcion: "Pan de campo, queso crema deslactosado o yogurt griego, rúcula y pepino en láminas, salmón ahumado, eneldo fresco y semillas.",
    opciones: [{ grupo: "Base", opciones: ["Queso crema deslactosado", "Yogurt griego natural"] }],
    ingredientes: ["Pan de campo", "Queso crema deslactosado o yogurt griego", "Rúcula", "Pepino", "Salmón ahumado", "Eneldo", "Semillas"],
    alergenos: ["Gluten", "Pescado", "Lácteos", "Sésamo"], destacado: true },

  { id: "toston-casa-2", foto: "fotos/toston-casa-2.webp", nombre: "Tostón de la casa 2", precio: 520, categoria: "desayunos",
    descripcion: "Pan de campo, hummus de garbanzos, pollo grillado orgánico, berenjenas asadas, cherrys confitados y semillas.",
    ingredientes: ["Pan de campo", "Hummus de garbanzos", "Pollo grillado orgánico", "Berenjenas asadas", "Cherrys confitados", "Semillas"],
    alergenos: ["Gluten", "Sésamo"] },

  { id: "sandwich-caliente", foto: "fotos/sandwich-caliente.webp", nombre: "Sándwich caliente", precio: 350, categoria: "desayunos",
    descripcion: "Clásico o sin gluten.",
    opciones: [{ grupo: "Pan", opciones: ["Clásico", "Sin gluten"] }],
    etiquetas: ["Sin gluten"],
    ingredientes: ["Pan", "Jamón", "Queso"],
    alergenos: ["Lácteos", "Gluten"] },

  { id: "sandwich-pan-nuez", foto: "fotos/sandwich-pan-nuez.webp", nombre: "Sándwich caliente en pan de nuez", precio: 350, categoria: "desayunos",
    descripcion: "En nuestro pan de nuez.",
    ingredientes: ["Pan de nuez", "Jamón", "Queso"],
    alergenos: ["Gluten", "Frutos secos", "Lácteos"] },

  { id: "medialuna-clasica", foto: "fotos/medialuna-clasica.webp", nombre: "Medialuna clásica", precio: 140, categoria: "desayunos",
    descripcion: "Por unidad.",
    alergenos: ["Gluten", "Lácteos", "Huevo"] },

  { id: "medialuna-rellena", foto: "fotos/medialuna-rellena.webp", nombre: "Medialuna rellena", precio: 180, categoria: "desayunos",
    descripcion: "Por unidad.",
    alergenos: ["Gluten", "Lácteos", "Huevo"] },

  { id: "chipa", foto: "fotos/chipa.webp", nombre: "Chipá", precio: 160, categoria: "desayunos",
    descripcion: "Clásico o saborizado.",
    ingredientes: ["Almidón de mandioca", "Queso", "Huevo"],
    alergenos: ["Lácteos", "Huevo"], libreDe: ["Gluten"] },

  { id: "chipa-relleno", foto: "fotos/chipa-relleno.webp", nombre: "Chipá relleno", precio: 190, categoria: "desayunos",
    descripcion: "Clásico o saborizado, relleno.",
    ingredientes: ["Almidón de mandioca", "Queso", "Huevo"],
    alergenos: ["Lácteos", "Huevo"], libreDe: ["Gluten"] },

  { id: "panqueque-avena", foto: "fotos/panqueque-avena.webp", nombre: "Panqueque de avena y banana", precio: 350, categoria: "desayunos",
    descripcion: "Con o sin scoop de proteína.",
    opciones: [{ grupo: "Scoop de proteína", opciones: ["Sin scoop", "Con scoop"] }],
    etiquetas: ["Proteico"],
    ingredientes: ["Avena", "Banana", "Huevo"],
    alergenos: ["Huevo", "Gluten"] },

  { id: "french-toast", recorte: "fotos/recortes/french-toast.webp", foto: "fotos/french-toast.webp", nombre: "French toast clásico", precio: 420, categoria: "desayunos",
    descripcion: "Reducción de frutos rojos casera, frutas picadas, granola casera y jarabe de agave.",
    ingredientes: ["Pan", "Huevo", "Leche", "Reducción de frutos rojos", "Frutas picadas", "Granola casera", "Jarabe de agave"],
    alergenos: ["Gluten", "Huevo", "Lácteos", "Frutos secos"], destacado: true },

  { id: "yogurt-granola", foto: "fotos/yogurt-granola.webp", nombre: "Yogurt casero con granola", precio: 290, categoria: "desayunos",
    descripcion: "Yogurt y granola, ambos de la casa.",
    ingredientes: ["Yogurt casero", "Granola casera"],
    alergenos: ["Lácteos", "Frutos secos", "Gluten"] },

  { id: "alfajores", foto: "fotos/alfajores.webp", nombre: "Alfajores", precio: 320, categoria: "desayunos",
    descripcion: "Sin azúcar y sin harina.",
    etiquetas: ["Sin azúcar"],
    alergenos: ["Frutos secos"], libreDe: ["Gluten", "Azúcar agregada"] },

  { id: "cookies", foto: "fotos/cookies.webp", nombre: "Cookies", precio: 180, categoria: "desayunos",
    descripcion: "Sin harina y sin azúcar.",
    etiquetas: ["Sin azúcar"],
    alergenos: ["Frutos secos"], libreDe: ["Gluten", "Azúcar agregada"] },

  { id: "cookies-pistacho", foto: "fotos/cookies-pistacho.webp", nombre: "Cookies de pistachos", precio: 190, categoria: "desayunos",
    descripcion: "De pistacho, de la casa.",
    alergenos: ["Frutos secos"] },

  { id: "barritas-proteicas", foto: "fotos/barritas-proteicas.webp", nombre: "Barritas proteicas", precio: 220, categoria: "desayunos",
    descripcion: "Sin harina y sin azúcar.",
    etiquetas: ["Proteico"],
    alergenos: ["Frutos secos"], libreDe: ["Gluten", "Azúcar agregada"] },

  { id: "merienda-para-dos", foto: "fotos/merienda-para-dos.webp", nombre: "Merienda para dos saludable", precio: 1690, categoria: "desayunos",
    descripcion: "2 bebidas calientes, 2 exprimidos o jugo del día, caliente integral, mini panqueques de avena, mini tostones de palta y huevo revuelto, y 2 delicias dulces saludables.",
    etiquetas: ["Para compartir"],
    ingredientes: ["2 bebidas calientes", "2 exprimidos o jugo del día", "Caliente integral", "Mini panqueques de avena", "Mini tostones de palta y huevo", "2 delicias dulces saludables"],
    alergenos: ["Gluten", "Huevo", "Lácteos", "Frutos secos"], destacado: true },

  /* ===== ENTRADAS ===== */
  { id: "tartar-salmon", recorte: "fotos/recortes/tartar-salmon.webp", foto: "fotos/tartar-salmon.webp", nombre: "Tartar de salmón y camarones", precio: 450, categoria: "entradas",
    descripcion: "Envuelto en alga nori, con cebolla encurtida y salsa de mango.",
    ingredientes: ["Salmón", "Camarones", "Alga nori", "Cebolla encurtida", "Salsa de mango"],
    alergenos: ["Pescado", "Mariscos"], destacado: true },

  { id: "sopa-estacion", foto: "fotos/sopa-estacion.webp", nombre: "Sopa de estación", precio: 210, categoria: "entradas",
    descripcion: "Consultá por nuestra sopa casera de la semana." },

  { id: "croquetitas", foto: "fotos/croquetitas.webp", nombre: "Croquetitas", precio: 250, categoria: "entradas",
    descripcion: "Con rebozado sin gluten. Consultá el sabor de la semana.",
    etiquetas: ["Sin gluten"],
    alergenos: ["Huevo", "Lácteos"], libreDe: ["Gluten"] },

  { id: "berenjenas-rellenas", foto: "fotos/berenjenas-rellenas.webp", nombre: "Berenjenas crocantes rellenas", precio: 250, categoria: "entradas",
    descripcion: "Tres quesos y tomate natural, con salsa teriyaki casera.",
    etiquetas: ["Veggie"],
    ingredientes: ["Berenjenas", "Tres quesos", "Tomate natural", "Salsa teriyaki casera"],
    alergenos: ["Lácteos", "Gluten", "Soja"] },

  { id: "provolone", foto: "fotos/provolone.webp", nombre: "Provolone saborizado", precio: 350, categoria: "entradas",
    descripcion: "Variedad de sabores, consultá los disponibles.",
    alergenos: ["Lácteos"] },

  /* ===== COCINA ===== */
  { id: "salmon-almendrado", recorte: "fotos/recortes/salmon-almendrado.webp", foto: "fotos/salmon-almendrado.webp", nombre: "Salmón almendrado", precio: 1490, categoria: "cocina",
    descripcion: "Con espinacas a la crema.",
    ingredientes: ["Salmón", "Almendras", "Espinacas", "Crema"],
    alergenos: ["Pescado", "Frutos secos", "Lácteos"], destacado: true },

  { id: "suprema-grille", recorte: "fotos/recortes/suprema-grille.webp", foto: "fotos/suprema-grille.webp", nombre: "Suprema orgánica grillé", precio: 790, categoria: "cocina",
    descripcion: "Con guarnición a elección.",
    opciones: [GUARNICION],
    ingredientes: ["Suprema de pollo orgánico", "Guarnición a elección"],
    destacado: true },

  { id: "lasana-sin-gluten", foto: "fotos/lasana-sin-gluten.webp", nombre: "Lasaña saludable sin gluten", precio: 830, categoria: "cocina",
    descripcion: "De pollo en hebras y verduras asadas.",
    etiquetas: ["Sin gluten"],
    ingredientes: ["Masa sin gluten", "Pollo en hebras", "Verduras asadas", "Queso"],
    alergenos: ["Lácteos"], libreDe: ["Gluten"] },

  { id: "ternera-macerada", foto: "fotos/ternera-macerada.webp", nombre: "Ternera macerada", precio: 790, categoria: "cocina",
    descripcion: "Con papas y boniatos criollos.",
    ingredientes: ["Ternera", "Papas", "Boniatos criollos"] },

  { id: "carnes-braseadas", foto: "fotos/carnes-braseadas.webp", nombre: "Carnes braseadas", precio: 690, categoria: "cocina",
    descripcion: "Con guarnición a elección.",
    opciones: [GUARNICION] },

  { id: "milanesa", recorte: "fotos/recortes/milanesa.webp", foto: "fotos/milanesa.webp", nombre: "Milanesa", precio: 690, categoria: "cocina",
    descripcion: "De carne, pollo o berenjenas.",
    opciones: [
      { grupo: "Tipo", opciones: ["Carne", "Pollo", "Berenjenas"] },
      { grupo: "Rebozado", opciones: ["Clásico", "Proteico saludable"] }
    ],
    alergenos: ["Huevo", "Gluten"], destacado: true },

  { id: "milanesa-casa", foto: "fotos/milanesa-casa.webp", nombre: "Milanesa de la casa", precio: 810, categoria: "cocina",
    descripcion: "Queso azul, cebolla caramelizada, bondiola y nueces. Con guarnición.",
    opciones: [GUARNICION],
    ingredientes: ["Milanesa", "Queso azul", "Cebolla caramelizada", "Bondiola", "Nueces"],
    alergenos: ["Gluten", "Huevo", "Lácteos", "Frutos secos"] },

  { id: "hamburguesa-casera", foto: "fotos/hamburguesa-casera.webp", nombre: "Hamburguesa casera", precio: 590, categoria: "cocina",
    descripcion: "En pan sin gluten, con guarnición.",
    opciones: [
      { grupo: "Medallón", opciones: ["Pollo", "Carne", "Lentejas turcas"] },
      GUARNICION
    ],
    etiquetas: ["Sin gluten"],
    alergenos: ["Huevo"], libreDe: ["Gluten"] },

  { id: "wraps-sin-gluten", foto: "fotos/wraps-sin-gluten.webp", nombre: "Wraps sin gluten", precio: 590, categoria: "cocina",
    descripcion: "Con guarnición a elección.",
    opciones: [
      { grupo: "Relleno", opciones: ["Verduras", "Pollo", "Carne"] },
      GUARNICION
    ],
    etiquetas: ["Sin gluten"],
    libreDe: ["Gluten"] },

  { id: "ensalada-pollo", foto: "fotos/ensalada-pollo.webp", nombre: "Ensalada de pollo ahumado", precio: 550, categoria: "cocina",
    descripcion: "Colchón de verdes, palta en láminas, huevo duro, verdeo asado y aceitunas negras marinadas.",
    ingredientes: ["Pollo ahumado", "Verdes", "Palta", "Huevo duro", "Verdeo asado", "Aceitunas negras"],
    alergenos: ["Huevo"] },

  { id: "ensalada-casa", recorte: "fotos/recortes/ensalada-casa.webp", foto: "fotos/ensalada-casa.webp", nombre: "Ensalada de la casa", precio: 590, categoria: "cocina",
    descripcion: "Verdes, palta laminada, zanahoria, cebolla de verdeo, salmón ahumado, camarones, parmesano, cherrys confitados y almendras.",
    ingredientes: ["Verdes", "Palta", "Zanahoria", "Cebolla de verdeo", "Salmón ahumado", "Camarones", "Parmesano", "Cherrys confitados", "Almendras"],
    alergenos: ["Pescado", "Mariscos", "Lácteos", "Frutos secos"], destacado: true },

  { id: "ensalada-casa-veggie", foto: "fotos/ensalada-casa-veggie.webp", nombre: "Ensalada de la casa veggie", precio: 550, categoria: "cocina",
    descripcion: "Verdes, palta laminada, zanahoria, cebolla de verdeo, hummus de garbanzos, huevo duro, quinoa y frutos secos.",
    etiquetas: ["Veggie"],
    ingredientes: ["Verdes", "Palta", "Zanahoria", "Cebolla de verdeo", "Hummus", "Huevo duro", "Quinoa", "Frutos secos"],
    alergenos: ["Huevo", "Frutos secos", "Sésamo"] },

  { id: "pasta-del-dia", foto: "fotos/pasta-del-dia.webp", nombre: "Pasta del día", precio: 750, categoria: "cocina",
    descripcion: "Pasta casera con salsa a elección.",
    alergenos: ["Gluten", "Huevo"] },

  { id: "canelones-sin-gluten", foto: "fotos/canelones-sin-gluten.webp", nombre: "Canelones caseros sin gluten", precio: 790, categoria: "cocina",
    descripcion: "Gratinados con salsa de tomate natural.",
    opciones: [{ grupo: "Relleno", opciones: ["Carne", "Pollo", "Verduras"] }],
    etiquetas: ["Sin gluten"],
    alergenos: ["Lácteos", "Huevo"], libreDe: ["Gluten"] },

  /* ===== BEBIDAS ===== */
  { id: "limonada", recorte: "fotos/recortes/limonada.webp", foto: "fotos/limonada.webp", nombre: "Limonada casera", precio: 180, categoria: "bebidas",
    descripcion: "330 ml.", ingredientes: ["Limón", "Agua", "Menta"], destacado: true },

  { id: "jugo-natural", foto: "fotos/jugo-natural.webp", nombre: "Jugo natural", precio: 250, categoria: "bebidas",
    descripcion: "330 ml, exprimido al momento." },

  { id: "licuado", foto: "fotos/licuado.webp", nombre: "Licuado de frutas", precio: 280, categoria: "bebidas",
    descripcion: "330 ml.", alergenos: ["Lácteos"] },

  { id: "batido-proteina", foto: "fotos/batido-proteina.webp", nombre: "Batido con proteína", precio: 410, categoria: "bebidas",
    descripcion: "Con scoop de proteína.", etiquetas: ["Proteico"], alergenos: ["Lácteos"] },

  { id: "agua-mineral", foto: "fotos/agua-mineral.webp", nombre: "Agua mineral", precio: 120, categoria: "bebidas",
    descripcion: "600 ml." },

  { id: "refresco-600", foto: "fotos/refresco-600.webp", nombre: "Refresco 600 ml", precio: 130, categoria: "bebidas",
    descripcion: "Consultá las variedades." },

  { id: "refresco-250", foto: "fotos/refresco-250.webp", nombre: "Refresco 250 ml", precio: 80, categoria: "bebidas",
    descripcion: "Consultá las variedades." },

  { id: "jugo-cepita", foto: "fotos/jugo-cepita.webp", nombre: "Jugo Cepita", precio: 80, categoria: "bebidas",
    descripcion: "250 ml." },

  { id: "energizante", foto: "fotos/energizante.webp", nombre: "Energizante", precio: 130, categoria: "bebidas",
    descripcion: "Lata." },

  { id: "cerveza-corona", foto: "fotos/cerveza-corona.webp", nombre: "Cerveza Corona", precio: 240, categoria: "bebidas",
    descripcion: "Botella.", etiquetas: ["+18"] },

  { id: "copa-vino", foto: "fotos/copa-vino.webp", nombre: "Copa de vino", precio: 230, categoria: "bebidas",
    descripcion: "Consultá la etiqueta del día.", etiquetas: ["+18"] },

  { id: "botella-vino", foto: "fotos/botella-vino.webp", nombre: "Botella de vino", precio: 590, categoria: "bebidas",
    descripcion: "750 ml.", etiquetas: ["+18"] }
];

/* ---------- Ventas cruzadas ----------
   Qué ofrecer cuando alguien agrega algo de cada categoría.
   "sugerir" es una lista de ids de producto, en orden de prioridad.
   No se ofrecen productos que ya estén en el pedido ni los agotados. */
var VENTA_CRUZADA = {
  cocina:    { titulo: "¿Algo para tomar?",       sugerir: ["limonada", "jugo-natural", "agua-mineral", "refresco-600", "licuado", "copa-vino"] },
  entradas:  { titulo: "¿Lo acompañás con algo?", sugerir: ["limonada", "copa-vino", "cerveza-corona", "agua-mineral", "jugo-natural"] },
  desayunos: { titulo: "¿Le sumás un café?",      sugerir: ["flat-white", "capuchino", "latte", "cortado", "jugo-natural", "matcha-latte"] },
  cafeteria: { titulo: "¿Algo para acompañar?",   sugerir: ["medialuna-clasica", "chipa", "alfajores", "cookies", "toston-clasico", "medialuna-rellena"] },
  bebidas:   { titulo: "¿Algo para picar?",       sugerir: ["chipa", "croquetitas", "provolone", "cookies", "medialuna-clasica"] }
};

/* ---------- Según la hora ----------
   Qué se muestra primero en "Todo", en cada categoría y en los recomendados,
   según el momento del día (hora de Montevideo).
   categorias: qué categorías van primero en "Todo" · primero: productos que van arriba de todo */
var MOMENTOS = [
  { id: "desayuno", nombre: "Desayuno", desde: "00:00", hasta: "11:30", titulo: "Para arrancar el día",
    categorias: ["desayunos", "cafeteria", "bebidas", "entradas", "cocina"],
    primero: ["flat-white", "toston-clasico", "medialuna-clasica", "capuchino", "french-toast", "yogurt-granola", "panqueque-avena", "jugo-natural"] },
  { id: "almuerzo", nombre: "Almuerzo", desde: "11:30", hasta: "15:30", titulo: "Para el almuerzo",
    categorias: ["cocina", "entradas", "bebidas", "cafeteria", "desayunos"],
    primero: ["milanesa", "suprema-grille", "salmon-almendrado", "ensalada-casa", "hamburguesa-casera", "tartar-salmon", "limonada", "jugo-natural"] },
  { id: "merienda", nombre: "Merienda", desde: "15:30", hasta: "24:00", titulo: "Para la merienda",
    categorias: ["cafeteria", "desayunos", "bebidas", "entradas", "cocina"],
    primero: ["merienda-para-dos", "capuchino", "alfajores", "french-toast", "chipa", "cookies", "medialuna-rellena", "submarino"] }
];

/* No tocar: deja la carta disponible para la app */
window.CARTA = { LOCAL: LOCAL, CATEGORIAS: CATEGORIAS, PRODUCTOS: PRODUCTOS, VENTA_CRUZADA: VENTA_CRUZADA, MOMENTOS: MOMENTOS };
