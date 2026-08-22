import type {
  CelularRecord,
  ComentarioRecord,
  Dataset,
  EspecificacionRecord,
  MarcaRecord,
} from "./types";

/**
 * Semilla de desarrollo del backoffice.
 *
 * El dashboard es **solo frontend**: los endpoints de escritura
 * (`POST`/`PATCH`/`DELETE`) y los `GET` de listado que le faltan a la API
 * (`/api/marcas`, `/api/especificaciones`) todavía no existen. Hasta que
 * lleguen, `src/lib/backoffice/api.ts` sirve estos datos desde memoria, así que
 * el dashboard se recorre entero sin BD levantada.
 *
 * Los valores no son de relleno: salen de `src/seed/seed.sql`, con los mismos
 * modelos, precios, fechas y URLs de AppleDB. Se añaden dos marcas y dos
 * celulares ajenos al seed para que el dashboard muestre lo que el catálogo
 * real todavía no tiene: varias marcas, celulares sin imágenes y celulares sin
 * ficha técnica (el caso del botón "+" del listado de celulares).
 *
 * Los UUID están escritos a mano —no generados— para que los enlaces profundos
 * (`?filter={"celular_id":"…"}`) sean reproducibles entre recargas.
 */

const IMG = "https://img.appledb.dev/device@256";

const APPLE = "9f1c0a10-1111-4a11-8a11-000000000001";
const SAMSUNG = "9f1c0a10-1111-4a11-8a11-000000000002";
const XIAOMI = "9f1c0a10-1111-4a11-8a11-000000000003";

const cel = (n: number) =>
  `c0de0000-2222-4b22-8b22-${String(n).padStart(12, "0")}`;
const esp = (n: number) =>
  `e5be0000-3333-4c33-8c33-${String(n).padStart(12, "0")}`;
const com = (n: number) =>
  `d0c00000-4444-4d44-8d44-${String(n).padStart(12, "0")}`;

const MARCAS: MarcaRecord[] = [
  {
    id: APPLE,
    nombre: "Apple",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    pais_origen: "Estados Unidos",
    created_at: "2026-08-01T09:00:00.000Z",
  },
  {
    id: SAMSUNG,
    nombre: "Samsung",
    logo_url:
      "https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg",
    pais_origen: "Corea del Sur",
    created_at: "2026-08-04T11:20:00.000Z",
  },
  {
    // Sin logo: la miniatura tiene que degradar a marcador, no romperse.
    id: XIAOMI,
    nombre: "Xiaomi",
    logo_url: null,
    pais_origen: "China",
    created_at: "2026-08-06T16:45:00.000Z",
  },
];

const CELULARES: CelularRecord[] = [
  {
    id: cel(1),
    marca_id: APPLE,
    modelo: "iPhone 15 Pro",
    precio: 999,
    fecha_lanzamiento: "2023-09-22",
    images_urls: `${IMG}/iPhone16%2C1/Black%20Titanium.png,${IMG}/iPhone16%2C1/Blue%20Titanium.png,${IMG}/iPhone16%2C1/Natural%20Titanium.png,${IMG}/iPhone16%2C1/White%20Titanium.png`,
    created_at: "2026-08-10T08:12:00.000Z",
  },
  {
    id: cel(2),
    marca_id: APPLE,
    modelo: "iPhone 15 Pro Max",
    precio: 1199,
    fecha_lanzamiento: "2023-09-22",
    images_urls: `${IMG}/iPhone16%2C2/Black%20Titanium.png,${IMG}/iPhone16%2C2/Blue%20Titanium.png,${IMG}/iPhone16%2C2/Natural%20Titanium.png,${IMG}/iPhone16%2C2/White%20Titanium.png`,
    created_at: "2026-08-10T08:14:00.000Z",
  },
  {
    id: cel(3),
    marca_id: APPLE,
    modelo: "iPhone 16",
    precio: 799,
    fecha_lanzamiento: "2024-09-20",
    images_urls: `${IMG}/iPhone17%2C3/Black.png,${IMG}/iPhone17%2C3/Pink.png,${IMG}/iPhone17%2C3/Teal.png,${IMG}/iPhone17%2C3/Ultramarine.png,${IMG}/iPhone17%2C3/White.png`,
    created_at: "2026-08-11T10:02:00.000Z",
  },
  {
    id: cel(4),
    marca_id: APPLE,
    modelo: "iPhone 16 Plus",
    precio: 899,
    fecha_lanzamiento: "2024-09-20",
    images_urls: `${IMG}/iPhone17%2C4/Black.png,${IMG}/iPhone17%2C4/Pink.png,${IMG}/iPhone17%2C4/Teal.png,${IMG}/iPhone17%2C4/Ultramarine.png,${IMG}/iPhone17%2C4/White.png`,
    created_at: "2026-08-11T10:05:00.000Z",
  },
  {
    id: cel(5),
    marca_id: APPLE,
    modelo: "iPhone 16 Pro",
    precio: 999,
    fecha_lanzamiento: "2024-09-20",
    images_urls: `${IMG}/iPhone17%2C1/Black%20Titanium.png,${IMG}/iPhone17%2C1/Desert%20Titanium.png,${IMG}/iPhone17%2C1/Natural%20Titanium.png,${IMG}/iPhone17%2C1/White%20Titanium.png`,
    created_at: "2026-08-12T09:31:00.000Z",
  },
  {
    id: cel(6),
    marca_id: APPLE,
    modelo: "iPhone 16 Pro Max",
    precio: 1199,
    fecha_lanzamiento: "2024-09-20",
    images_urls: `${IMG}/iPhone17%2C2/Black%20Titanium.png,${IMG}/iPhone17%2C2/Desert%20Titanium.png,${IMG}/iPhone17%2C2/Natural%20Titanium.png,${IMG}/iPhone17%2C2/White%20Titanium.png`,
    created_at: "2026-08-12T09:33:00.000Z",
  },
  {
    id: cel(7),
    marca_id: APPLE,
    modelo: "iPhone 16e",
    precio: 599,
    fecha_lanzamiento: "2025-02-28",
    images_urls: `${IMG}/iPhone17%2C5/Black.png,${IMG}/iPhone17%2C5/White.png`,
    created_at: "2026-08-13T15:47:00.000Z",
  },
  {
    id: cel(8),
    marca_id: APPLE,
    modelo: "iPhone 17",
    precio: 799,
    fecha_lanzamiento: "2025-09-19",
    images_urls: `${IMG}/iPhone18%2C3/Black.png,${IMG}/iPhone18%2C3/Lavender.png,${IMG}/iPhone18%2C3/Mist%20Blue.png,${IMG}/iPhone18%2C3/Sage.png,${IMG}/iPhone18%2C3/White.png`,
    created_at: "2026-08-14T11:08:00.000Z",
  },
  {
    id: cel(9),
    marca_id: APPLE,
    modelo: "iPhone Air",
    precio: 999,
    fecha_lanzamiento: "2025-09-19",
    images_urls: `${IMG}/iPhone18%2C4/Cloud%20White.png,${IMG}/iPhone18%2C4/Light%20Gold.png,${IMG}/iPhone18%2C4/Sky%20Blue.png,${IMG}/iPhone18%2C4/Space%20Black.png`,
    created_at: "2026-08-14T11:12:00.000Z",
  },
  {
    id: cel(10),
    marca_id: APPLE,
    modelo: "iPhone 17 Pro",
    precio: 1099,
    fecha_lanzamiento: "2025-09-19",
    images_urls: `${IMG}/iPhone18%2C1/Cosmic%20Orange.png,${IMG}/iPhone18%2C1/Deep%20Blue.png,${IMG}/iPhone18%2C1/Silver.png`,
    created_at: "2026-08-15T08:55:00.000Z",
  },
  {
    id: cel(11),
    marca_id: APPLE,
    modelo: "iPhone 17 Pro Max",
    precio: 1199,
    fecha_lanzamiento: "2025-09-19",
    images_urls: `${IMG}/iPhone18%2C1/Cosmic%20Orange.png,${IMG}/iPhone18%2C1/Deep%20Blue.png,${IMG}/iPhone18%2C1/Silver.png`,
    created_at: "2026-08-15T08:57:00.000Z",
  },
  // Los tres siguientes no tienen ficha técnica: son el caso del botón "+".
  {
    id: cel(12),
    marca_id: APPLE,
    modelo: "iPhone 17e",
    precio: 599,
    fecha_lanzamiento: "2026-03-11",
    images_urls: `${IMG}/iPhone18%2C5/Black.png,${IMG}/iPhone18%2C5/Soft%20Pink.png,${IMG}/iPhone18%2C5/White.png`,
    created_at: "2026-08-18T17:24:00.000Z",
  },
  {
    id: cel(13),
    marca_id: SAMSUNG,
    modelo: "Galaxy S25 Ultra",
    precio: 1299,
    fecha_lanzamiento: "2025-02-07",
    images_urls: null,
    created_at: "2026-08-19T12:40:00.000Z",
  },
  {
    id: cel(14),
    marca_id: XIAOMI,
    modelo: "Xiaomi 15 Ultra",
    precio: 1099,
    fecha_lanzamiento: "2025-03-14",
    images_urls: null,
    created_at: "2026-08-20T09:18:00.000Z",
  },
];

const ESPECIFICACIONES: EspecificacionRecord[] = [
  {
    id: esp(1),
    celular_id: cel(1),
    procesador: "Apple A17 Pro",
    ram: "8 GB",
    almacenamiento: "128GB / 256GB / 512GB / 1TB",
    pantalla: '6.1" Super Retina XDR ProMotion 120Hz',
    camara: "48 MP Main + 12 MP UW + 12 MP Tele 3x",
    bateria: "3274 mAh",
    sistema_op: "iOS 17.0",
    created_at: "2026-08-10T08:20:00.000Z",
  },
  {
    id: esp(2),
    celular_id: cel(2),
    procesador: "Apple A17 Pro",
    ram: "8 GB",
    almacenamiento: "256GB / 512GB / 1TB",
    pantalla: '6.7" Super Retina XDR ProMotion 120Hz',
    camara: "48 MP Main + 12 MP UW + 12 MP Tele 5x",
    bateria: "4441 mAh",
    sistema_op: "iOS 17.0",
    created_at: "2026-08-10T08:22:00.000Z",
  },
  {
    id: esp(3),
    celular_id: cel(3),
    procesador: "Apple A18 (Apple Intelligence)",
    ram: "8 GB",
    almacenamiento: "128GB / 256GB / 512GB",
    pantalla: '6.1" OLED + Camera Control',
    camara: "48 MP Fusion + 12 MP Ultra Wide",
    bateria: "3561 mAh",
    sistema_op: "iOS 18.0",
    created_at: "2026-08-11T10:10:00.000Z",
  },
  {
    id: esp(4),
    celular_id: cel(4),
    procesador: "Apple A18 (Apple Intelligence)",
    ram: "8 GB",
    almacenamiento: "128GB / 256GB / 512GB",
    pantalla: '6.7" OLED + Camera Control',
    camara: "48 MP Fusion + 12 MP Ultra Wide",
    bateria: "4674 mAh",
    sistema_op: "iOS 18.0",
    created_at: "2026-08-11T10:12:00.000Z",
  },
  {
    id: esp(5),
    celular_id: cel(5),
    procesador: "Apple A18 Pro",
    ram: "8 GB",
    almacenamiento: "128GB / 256GB / 512GB / 1TB",
    pantalla: '6.3" Borderless ProMotion 120Hz',
    camara: "48 MP Fusion + 48 MP UW + 12 MP Tele 5x + 4K 120fps",
    bateria: "3582 mAh",
    sistema_op: "iOS 18.0",
    created_at: "2026-08-12T09:40:00.000Z",
  },
  {
    id: esp(6),
    celular_id: cel(6),
    procesador: "Apple A18 Pro",
    ram: "8 GB",
    almacenamiento: "256GB / 512GB / 1TB",
    pantalla: '6.9" Borderless ProMotion 120Hz',
    camara: "48 MP Fusion + 48 MP UW + 12 MP Tele 5x + 4K 120fps",
    bateria: "4685 mAh",
    sistema_op: "iOS 18.0",
    created_at: "2026-08-12T09:42:00.000Z",
  },
  {
    id: esp(7),
    celular_id: cel(7),
    procesador: "Apple A18",
    ram: "8 GB",
    almacenamiento: "128GB / 256GB",
    pantalla: '6.1" OLED Dynamic Island',
    camara: "48 MP Single Fusion Camera",
    bateria: "3200 mAh",
    sistema_op: "iOS 18.3",
    created_at: "2026-08-13T15:55:00.000Z",
  },
  {
    id: esp(8),
    celular_id: cel(8),
    procesador: "Apple A19 (3nm)",
    ram: "8 GB",
    almacenamiento: "128GB / 256GB / 512GB",
    pantalla: '6.1" OLED ProMotion 120Hz',
    camara: "48 MP Main + 48 MP Ultra Wide",
    bateria: "3600 mAh",
    sistema_op: "iOS 26.0",
    created_at: "2026-08-14T11:20:00.000Z",
  },
  {
    id: esp(9),
    celular_id: cel(9),
    procesador: "Apple A19 Pro",
    ram: "8 GB",
    almacenamiento: "256GB / 512GB / 1TB",
    pantalla: '6.6" Slim OLED 120Hz (eSIM-only)',
    camara: "48 MP Main Fusion + 24 MP TrueDepth",
    bateria: "3100 mAh",
    sistema_op: "iOS 26.0",
    created_at: "2026-08-14T11:24:00.000Z",
  },
  {
    id: esp(10),
    celular_id: cel(10),
    procesador: "Apple A19 Pro",
    ram: "12 GB",
    almacenamiento: "256GB / 512GB / 1TB / 2TB",
    pantalla: '6.3" ProMotion 120Hz Anti-reflective',
    camara: "Triple 48 MP (Main, Ultra-Wide, Telephoto 5x)",
    bateria: "3800 mAh",
    sistema_op: "iOS 26.0",
    created_at: "2026-08-15T09:05:00.000Z",
  },
  {
    id: esp(11),
    celular_id: cel(11),
    procesador: "Apple A19 Pro",
    ram: "12 GB",
    almacenamiento: "256GB / 512GB / 1TB / 2TB",
    pantalla: '6.9" ProMotion 120Hz Anti-reflective',
    camara: "Triple 48 MP (Main, Ultra-Wide, Telephoto 5x)",
    bateria: "4823 mAh",
    sistema_op: "iOS 26.0",
    created_at: "2026-08-15T09:07:00.000Z",
  },
];

const COMENTARIOS: ComentarioRecord[] = [
  {
    id: com(1),
    celular_id: cel(10),
    nombre: "Federico Villamil",
    mensaje:
      "Ahora el modelo base trae 120 Hz y arranca en 256 GB. Es la mejor generación en años.",
    calificacion: 5,
    fecha: "2026-08-20T17:18:00.000Z",
  },
  {
    id: com(2),
    celular_id: cel(9),
    nombre: "Tobías Encinas",
    mensaje:
      "Cinco milímetros y medio de grosor que hay que tener en la mano para creerlo.",
    calificacion: 5,
    fecha: "2026-08-19T10:47:00.000Z",
  },
  {
    id: com(3),
    celular_id: cel(9),
    nombre: "Elsa Miramontes",
    mensaje:
      "Es una obra de ingeniería, pero con una sola cámara y batería justa pagas el diseño.",
    calificacion: 3,
    fecha: "2026-08-18T21:29:00.000Z",
  },
  {
    id: com(4),
    celular_id: cel(8),
    nombre: "Marisol Otero",
    mensaje:
      "La pantalla antirreflejo se agradece al sol y el color lavanda es muy bonito.",
    calificacion: 5,
    fecha: "2026-08-17T12:55:00.000Z",
  },
  {
    id: com(5),
    celular_id: cel(3),
    nombre: "Irene Cabrera",
    mensaje:
      "El control de cámara es cómodo una vez le agarras el punto. El ultramarino se ve mejor en persona.",
    calificacion: 4,
    fecha: "2026-08-16T13:45:00.000Z",
  },
  {
    id: com(6),
    celular_id: cel(3),
    nombre: "Álex Montenegro",
    mensaje:
      "Mucho rendimiento para lo que cuesta, aunque compré pensando en funciones que llegaron meses después.",
    calificacion: 3,
    fecha: "2026-08-15T10:29:00.000Z",
  },
  {
    id: com(7),
    celular_id: cel(6),
    nombre: "Nuria Lastra",
    mensaje:
      "La autonomía es descomunal y el teleobjetivo 5x por fin llega al Pro Max sin peros.",
    calificacion: 5,
    fecha: "2026-08-14T19:02:00.000Z",
  },
  {
    id: com(8),
    celular_id: cel(5),
    nombre: "Gonzalo Peñaranda",
    mensaje:
      "Se calienta con juegos exigentes, pero el salto de cámara respecto al 15 Pro es real.",
    calificacion: 4,
    fecha: "2026-08-13T08:36:00.000Z",
  },
  {
    id: com(9),
    celular_id: cel(7),
    nombre: "Camila Restrepo",
    mensaje:
      "Para el precio es imbatible: mismo procesador que el modelo grande y batería de sobra.",
    calificacion: 4,
    fecha: "2026-08-12T16:11:00.000Z",
  },
  {
    id: com(10),
    celular_id: cel(2),
    nombre: "Héctor Villalba",
    mensaje:
      "Dos años después sigue rindiendo perfecto. El titanio aguanta mejor de lo que esperaba.",
    calificacion: 5,
    fecha: "2026-08-11T14:23:00.000Z",
  },
  {
    id: com(11),
    celular_id: cel(1),
    nombre: "Paula Iriarte",
    mensaje:
      "El botón de acción es más útil de lo que parecía. Le falta batería para un día largo.",
    calificacion: 4,
    fecha: "2026-08-10T09:50:00.000Z",
  },
  {
    id: com(12),
    celular_id: cel(4),
    nombre: "Diego Sanabria",
    mensaje:
      "Pantalla grande sin pagar el precio del Pro Max. La cámara cumple de sobra para el día a día.",
    calificacion: 4,
    fecha: "2026-08-09T18:07:00.000Z",
  },
];

/** Copia profunda: el mock muta su propia estructura, nunca esta semilla. */
export function crearDatasetInicial(): Dataset {
  return structuredClone({
    marcas: MARCAS,
    celulares: CELULARES,
    especificaciones: ESPECIFICACIONES,
    comentarios: COMENTARIOS,
  });
}
