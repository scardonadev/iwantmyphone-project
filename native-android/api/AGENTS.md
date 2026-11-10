# API de la app nativa — Express + TypeScript

Backend de la app Android de iwantmyphone. Proyecto **independiente** del Next de la raíz: su propio `package.json`, su propia base (`iwantmyphone_app`) y ningún import de `app/` ni de `src/`. Del Next copia, sin compartirlos, los datos del seed, el formato de hash scrypt y el sobre de respuestas.

Modelo de datos: [`db/db-diagram.dbml`](db/db-diagram.dbml). Alcance y roles: [`../AGENTS.md`](../AGENTS.md) §3.

## 1. Stack

| Área | Decisión | Motivo |
| --- | --- | --- |
| Runtime | Node ≥ 22.18 (probado con 24) | Ejecuta `.ts` sin compilar (*type stripping*) |
| Lenguaje | TypeScript 7 `strict`, `erasableSyntaxOnly` | Node solo borra tipos: nada de `enum`, `namespace` ni *parameter properties* |
| HTTP | Express 5 | Los handlers `async` que lanzan llegan solos al manejador de errores |
| BD | PostgreSQL vía `pg`, SQL parametrizado | Igual que el Next: el esquema es SQL y un ORM lo duplicaría |
| Sesión | JWT HS256 con `jose`, `Authorization: Bearer` | El cliente es una app: sin cookies |
| Contraseñas | scrypt de `node:crypto` | Mismo formato que el Next, sin dependencias nativas |
| Correo | `nodemailer` contra el SMTP propio | Variables `SMTP_*` |
| Pagos | ePayco (checkout estándar) | Ver §6 |

Los imports relativos llevan extensión `.ts` (`import { query } from "./db.ts"`). `tsc` las reescribe a `.js` al compilar (`rewriteRelativeImportExtensions`).

## 2. Puesta en marcha

```powershell
cd native-android\api
npm install
copy .env.example .env      # y rellenar (ver §3)
npm run db:setup            # crea la BD si falta, aplica el esquema y siembra
npm run dev                 # http://localhost:4000, recarga al guardar
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | `node --watch src/server.ts` con `.env` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run build` | Compila a `dist/` |
| `npm start` | Producción: `node dist/src/server.js` |
| `npm run db:setup` | Crea la base si no existe (el usuario necesita `CREATEDB`), aplica `db/schema.sql` (idempotente) y siembra `db/seed.sql` **solo si `marcas` está vacía** |
| `npm run db:reset` | `DROP` de las 13 tablas y 3 tipos de la app, y esquema + seed desde cero |
| `npm run smoke` | Prueba de punta a punta (§8) |

**Salvaguarda contra la base del Next.** Comparten host y nombres de tabla. `db/setup.ts` se niega a tocar una base que tenga `usuarios` sin columna `email`, que es la firma de la base del Next. Un `DATABASE_URL` mal copiado no puede borrarla con `db:reset`.

Al arrancar, la API informa de la base a la que se conectó, del estado del SMTP (verifica la conexión) y de si ePayco está configurado.

### Usuarios de desarrollo (del seed)

| Rol | Correo | Contraseña |
| --- | --- | --- |
| administrador | `admin@iwantmyphone.dev` | `Admin1234` |
| vendedor | `vendedor@iwantmyphone.dev` | `Vendedor1234` |
| visitante | `visitante@iwantmyphone.dev` | `Visitante1234` |
| 12 clientes (dueños de los pedidos sintéticos) | `cliente01..12@example.com` | `Visitante1234` |

Fuera de local, cambia esas contraseñas o borra los usuarios. Ninguno de ellos tiene huella registrada: la app pide registrarla en el primer inicio de sesión.

## 3. Variables de entorno

Todo se lee en `src/config.ts`, el único sitio que toca `process.env`. Si falta algo imprescindible, la API **no arranca** y dice qué falta.

| Variable | Obligatoria | Uso |
| --- | :-: | --- |
| `PORT` | | Puerto (4000) |
| `PUBLIC_URL` | en prod | URL pública sin barra final. Se usa en las URLs de confirmación y respuesta de ePayco y en el `checkout_url`, así que en producción ePayco tiene que poder alcanzarla |
| `APP_TIMEZONE` | | Dónde se corta "hoy", "ayer" y "esta semana" en los reportes (`America/Bogota`) |
| `MONEDA` | | Moneda de los precios (`USD`: el seed viene en dólares). Va a ePayco tal cual |
| `DATABASE_URL` | ✓ | Base **propia** de la app, nunca la del Next |
| `DATABASE_SSL` | | `true` para conexiones TLS |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | ✓ | Mínimo 32 caracteres cada uno y **distintos** entre sí |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | | Segundos (900 y 2 592 000) |

### Correo (SMTP propio)

| Variable | Uso |
| --- | --- |
| `SMTP_HOST` | Servidor. **Sin él, no se envía nada**: el correo se escribe en la consola de la API (útil en desarrollo, nunca en producción) |
| `SMTP_PORT` + `SMTP_SECURE` | `465` + `true` (TLS implícito) o `587` + `false` (STARTTLS) |
| `SMTP_USER` / `SMTP_PASSWORD` | Credenciales. Sin `SMTP_USER` se conecta sin autenticar (relay interno) |
| `SMTP_FROM` | Remitente, p. ej. `"iwantmyphone <no-reply@tu-dominio.com>"`. Tiene que estar autorizado por el SPF/DKIM del dominio o el correo acabará en spam |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | `false` solo si el servidor usa un certificado autofirmado |

Al arrancar se hace un `verify()` contra el servidor. Si falla, la API arranca igual y el log dice por qué.

### ePayco

| Variable | Uso |
| --- | --- |
| `EPAYCO_P_CUST_ID_CLIENTE` / `EPAYCO_P_KEY` | **Secretos.** Firman la confirmación |
| `EPAYCO_PUBLIC_KEY` | Pública: la usa el checkout en el navegador |
| `EPAYCO_TEST` | `true` = transacciones de prueba |

Sin las tres llaves, `GET /api/metodos-pago` no ofrece ePayco y solo queda contraentrega.

## 4. Estructura

```
api/
  db/
    db-diagram.dbml      # Modelo (fuente de verdad del esquema)
    schema.sql           # Traducción del DBML; idempotente
    seed.sql             # GENERADO desde src/seed/seed.sql del Next + datos de la app
    setup.ts             # db:setup / db:reset
  src/
    server.ts            # listen + diagnóstico de arranque
    app.ts               # crearApp(): routers y manejador de errores (sin listen, para las pruebas)
    config.ts            # Única lectura de process.env
    db.ts                # Pool, type parsers, query/queryOne/transaccion
    http.ts              # Sobre de respuesta, ApiError, conRestricciones, paginación
    validacion.ts        # Validador de cuerpos (errores acumulados en details.campos)
    permisos.ts          # Roles y matriz de permisos
    catalogo.ts          # SELECT base y DTO de un celular (compartidos)
    mail.ts              # SMTP + plantilla del correo de recuperación
    epayco.ts            # Firma, mapeo de estados y páginas del checkout
    auth/                # password (scrypt), tokens (jose), biometria (ECDSA), middleware
    routes/              # auth, celulares, marcas, catalogo-extra, perfil, pedidos, pagos, reportes, usuarios
    types/express.d.ts   # req.usuario
  scripts/
    smoke.ts             # Prueba de punta a punta
    revisar-seed.ts      # Coherencia de los datos sembrados
```

**Acceso a datos.** SQL parametrizado (`$1, $2…`) siempre. Las columnas de un `UPDATE` salen de una whitelist (lo que devolvió el validador), nunca de claves del cuerpo sin filtrar, y los fragmentos que varían (orden, periodo del reporte) salen de tablas constantes del código.

**Trampas de `pg` resueltas en `db.ts`**, como en el Next: `NUMERIC` y `INT8` llegan como `string` y se convierten a `number`, y `DATE` se deja como `"YYYY-MM-DD"` para que no retroceda un día. La sesión de BD fija `timezone = APP_TIMEZONE`.

### El seed

`db/seed.sql` se **generó** leyendo los bloques `VALUES` del seed del Next: mismos 52 celulares, 52 fichas y 87 comentarios. Añade lo que el Next no tiene, de forma determinista:

- `costo`: entre el 55 % y el 70 % del precio, según el modelo.
- `descuento_pct`: 5, 10 o 15 % en los lanzamientos de sep-2023 a ago-2025.
- `descripcion`: montada a partir de la ficha técnica.

Además siembra los usuarios de §2, una dirección por cliente y los métodos `contraentrega` y `epayco`. Por último, crea **~480 pedidos sintéticos** de los últimos 12 meses, siempre con algunos de hoy y de ayer, para que el reporte tenga datos. Cada pedido solo vende modelos ya lanzados en su fecha y con menos de 4 años.

`scripts/revisar-seed.ts` comprueba que todo cuadre: totales coherentes, nada vendido antes de su lanzamiento y números de pedido en orden cronológico.

## 5. Convenciones de la API

- Base `/api`. Éxito `{ success: true, data, meta? }`; error `{ success: false, error: { code, message, details? } }` con `BAD_REQUEST` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `TOO_MANY_REQUESTS` (429) e `INTERNAL_ERROR` (500).
- Errores de formato: **todos a la vez** en `details.campos` (`campo → "Etiqueta: mensaje."`). Un campo desconocido es 400 y sugiere el nombre bueno (`images_urls` → `images_url`). Un JSON mal formado es 400, nunca 500.
- `meta`: `{ page, limit, total, totalPages, hasNextPage }`. `page` empieza en 1 y `limit` admite como máximo 50.
- Todo id de la URL se valida como UUID antes de tocar la BD.
- Las violaciones de restricciones se traducen **por nombre** (`conRestricciones`): `marcas_nombre_key` → 409, `fk_celulares_marcas` → 400 al crear o 409 al borrar, etc. Renombrar una restricción en `schema.sql` rompe esa traducción.
- Lecturas del catálogo públicas; todo lo demás, con sesión.

### Sesión y permisos

- `POST /auth/login` o `/auth/registro` devuelve `{ usuario, access_token, refresh_token, token_type, expires_in }`.
- **Access** de 15 min en `Authorization: Bearer`. **Refresh** de 30 días, solo en `POST /auth/refresh`. Cada tipo de token lleva su audiencia, así que un refresh no abre la API.
- Los JWT solo llevan `sub`. **El usuario y su rol se releen de la BD en cada petición**: cambiar el rol o desactivar a alguien se aplica al instante, aunque su token siga vigente.
- Las rutas piden **permisos**, no roles (`requerir("reportes:ver")`). La matriz está en `src/permisos.ts` y `GET /api/roles` la muestra.
- **La API recorta, no la app.** `costo`, `costo_total`, `costo_unitario` y `utilidad` solo salen hacia quien tiene `costos:ver`. Un vendedor que envía `costo` en un producto recibe 403.

## 6. Endpoints

Leyenda: 🌐 público · 🔑 con sesión · 🛒 vendedor+ (permiso indicado) · 👑 administrador.

### Cuenta (`/api/auth`)

| | Endpoint | Notas |
| --- | --- | --- |
| 🌐 | `POST /registro` | `email`, `nombre`, `password` (8-128), `documento?`, `telefono?` y **`biometria: { dispositivo, public_key }` obligatoria**. Nace visitante y activo. 201 con sesión y `credencial_biometrica_id`. 409 si el correo existe |
| 🌐 | `POST /login` | Mismo 401 (y mismo tiempo) para correo inexistente y contraseña errónea. 403 si está desactivado, solo tras validar la contraseña |
| 🌐 | `POST /refresh` | `{ refresh_token }` → par nuevo |
| 🔑 | `GET /yo` · `PATCH /yo` | Datos propios. La contraseña se cambia con `password` + `password_actual` |
| 🔑 | `POST · GET /biometria/credenciales`, `DELETE /biometria/credenciales/:id` | Huellas de otros teléfonos |
| 🌐 | `POST /biometria/reto` | `{ credencial_id }` → JWT de 2 min |
| 🌐 | `POST /biometria/login` | `{ credencial_id, reto, firma }`. La firma es `SHA256withECDSA` (DER, base64) del reto. Cada reto vale **una sola vez** |
| 🌐 | `POST /recuperacion` | `{ email }`. Responde siempre lo mismo. Código de 6 dígitos por correo, válido 15 min. Máximo 3 solicitudes cada 15 min (429) |
| 🌐 | `POST /recuperacion/confirmar` | `{ email, codigo, password }`. 5 intentos por código, un solo uso |

**Huella.** El teléfono genera en el Keystore un par EC P-256 que solo se desbloquea con BiometricPrompt y manda la clave **pública** (SPKI DER en base64, `PublicKey.getEncoded()`). Entrar con huella = pedir un reto y firmarlo. La API verifica la firma con `node:crypto`. Ningún dato biométrico sale del teléfono.

### Catálogo

| | Endpoint | Notas |
| --- | --- | --- |
| 🌐 | `GET /home` | `banners` (4 más recientes, con descripción), `promociones`, `ultimos`, `mas_vendidos` (90 días) |
| 🌐 | `GET /celulares` | `q`, `filter` (JSON del Next), `marca_id`, `promocion=true`, `precio_min`, `precio_max`, `orden` (`recientes` · `precio_asc` · `precio_desc` · `nombre`), paginado |
| 🌐 | `GET /celulares/:id` | + `descripcion`, `valoracion`, `total_valoraciones`, `es_favorito` (si hay sesión), `especificaciones` (siempre las 7 claves en orden, o `[]`) |
| 🌐 | `GET /celulares/:id/sugeridos` | 5, con la regla del Next |
| 🛒 `reportes:ver` | `GET /celulares/:id/resumen-ventas` | `ultimo_anio`, `ultimo_mes`, `ultimos_7_dias`, `hoy` → `{ unidades, ventas, utilidad? }` |
| 🛒 `productos:gestionar` | `POST /celulares` · `PATCH /celulares/:id` · `DELETE /celulares/:id` | `especificaciones` en el mismo cuerpo (las 7, o `null` para quitarla). Borrar conserva los pedidos (la línea queda con `celular_id = NULL`) |
| 🌐 | `GET /marcas` · `GET /marcas/:id` | Sin paginar, con `total_celulares` |
| 🛒 `productos:gestionar` | `POST · PATCH · DELETE /marcas` | Nombre único sin distinguir mayúsculas (409). No se borra una marca con celulares (409) |
| 🌐 | `GET /especificaciones/opciones` · `GET /comentarios?celular_id=` | Contratos del Next |

Shape de un producto en listados: `{ id, marca: { id, nombre, logo }, modelo, nombre, images_url[], precio, descuento_pct, precio_final, costo?, fecha_lanzamiento, created_at }`.

### Comprador

| | Endpoint | Notas |
| --- | --- | --- |
| 🔑 | `GET /favoritos` · `PUT · DELETE /favoritos/:celularId` | `PUT` idempotente |
| 🔑 | `GET · POST /direcciones` · `PATCH · DELETE /direcciones/:id` | Solo las propias |
| 🌐 | `GET /metodos-pago` | Solo los disponibles (ePayco, si está configurado) |
| 🔑 | `POST /pedidos` | `{ items: [{ celular_id, cantidad }], direccion_id, metodo_pago_id }` |
| 🔑 | `GET /pedidos/mios` · `GET /pedidos/mios/:id` | Mis compras |
| 🔑 | `POST /pedidos/mios/:id/pagos` | Reintento de pago en pasarela |

**`POST /pedidos` no se fía de la app.** El carrito vive en el teléfono y solo llegan ids y cantidades (de 1 a 10; las líneas repetidas se suman). Precio, descuento y costo se leen de la BD dentro de la transacción y se copian al pedido junto con el comprador y la dirección. Si el método requiere pasarela, el pedido nace con un `pago` pendiente que trae su `checkout_url`.

### Gestión

| | Endpoint | Notas |
| --- | --- | --- |
| 🛒 `pedidos:gestionar` | `GET /pedidos` | `estado`, `q` (número, nombre o correo). Fecha, método de pago, nº de productos, estado, cliente y `utilidad?` |
| 🛒 `pedidos:gestionar` | `GET · DELETE /pedidos/:id` | Detalle con líneas, pagos y, para el administrador, costos |
| 🛒 `pedidos:gestionar` | `PATCH /pedidos/:id` | **Solo `estado`**. Entregar un pedido contraentrega fija `pagado_at` |
| 🛒 `reportes:ver` | `GET /reportes/ventas?periodo=` | `hoy` · `ayer` (por hora), `semana` · `mes` (por día), `anio` (por mes). Por calendario en `APP_TIMEZONE`, con los huecos a cero. `resumen`, `serie`, `top_productos`; costo y utilidad solo para el administrador. Los cancelados no cuentan |
| 👑 `usuarios:gestionar` | `GET /roles` · `GET · POST /usuarios` · `GET · PATCH · DELETE /usuarios/:id` | Nunca puede quedar sin un administrador activo (409). Nadie puede desactivarse, degradarse ni borrarse a sí mismo |

### ePayco (`/api/pagos/epayco`) — sin sobre JSON

| Endpoint | Para quién |
| --- | --- |
| `GET /checkout/:referencia` | El navegador del comprador. Página mínima que carga `checkout.js` con la llave **pública**. La referencia (`IWMP-<numero>-<24 hex aleatorios>`) no se puede adivinar y hace de permiso: la Custom Tab no necesita el token de sesión |
| `POST · GET /confirmacion` | El servidor de ePayco. **Única fuente de verdad** del pago |
| `GET /respuesta` | Adonde vuelve el comprador: "vuelve a la app". No cambia nada |

Reglas de la confirmación:

1. Comprueba la firma: `x_signature` = sha256(`p_cust_id_cliente^p_key^x_ref_payco^x_transaction_id^x_amount^x_currency_code`). Si no cuadra, 400.
2. Busca el pago por la referencia (`x_id_invoice`). Si no existe, 404.
3. Compara monto y moneda con los del pago. Si no coinciden, el pago **no** se aprueba y queda `fallido`, con la respuesta guardada para auditoría.
4. `x_cod_response` se traduce a `estado_pago`. Un pago aprobado solo cambia con un reverso (6). Si llega un segundo aprobado para el mismo pedido, se registra como fallido y se avisa en el log (reembolso manual).
5. Un pago aprobado pasa el pedido de `pendiente` a `confirmado` y fija `pagado_at`.

> **Antes de producción:** confirma la fórmula de la firma y el listado de `x_cod_response` en la documentación de tu cuenta de ePayco. La integración usa el checkout estándar (`checkout.js`). Si la cuenta usa el Smart Checkout por sesión, solo cambia `paginaCheckout()` en `src/epayco.ts`.

## 7. Seguridad: resumen

- Contraseñas con scrypt (N=16384). Login sin enumeración de usuarios (mismo mensaje, hash de relleno).
- Códigos de recuperación guardados como HMAC con un secreto del servidor, con caducidad, intentos limitados y un solo uso. El endpoint no revela si el correo existe.
- Huella por firma de clave pública. Los retos son de un solo uso.
- Ningún dato de tarjeta pasa por la API.
- Permisos y recorte de campos sensibles en el servidor.
- Sin CORS: el cliente no es un navegador de otro origen.

**Lo que no hay (y conviene saber):** no hay *rate limiting* general (solo en recuperación). El refresh token es sin estado: uno robado vale hasta su `exp`, y para cortar el acceso de verdad está `is_active`. Delante de la API, en producción, va un proxy con HTTPS: `trust proxy` está activado.

## 8. Verificación

`npm run smoke` levanta la app en un puerto libre contra la BD de `.env`, recorre **108 comprobaciones** y borra lo que creó. Usa llaves de ePayco falsas si no hay reales.

Cubre:

- Catálogo, filtros y escapes.
- Login de los tres roles y recorte de costos.
- Registro con huella real (par EC generado en la prueba), firma del reto y reto de un solo uso.
- Recuperación de contraseña.
- Compra con totales recalculados.
- Checkout y confirmación de ePayco: firma falsa, monto alterado, reintento, aprobado e idempotencia.
- Gestión de pedidos, los cinco periodos del reporte, CRUD con permisos y gestor de usuarios.

La colección de Postman (`../postman/`) se ejecutó entera con `newman` contra `npm run dev`: **73 peticiones y 84 aserciones**, todas correctas.

### Estado

- [x] `npm run typecheck` y `npm run build` limpios. El servidor compilado arranca y responde `/api/salud`.
- [x] Base `iwantmyphone_app` creada en el host del Next sin tocar `iwantmyphone_db`; el seed coincide en 52/52/87 con el del Next.
- [x] `npm run smoke`: 108/108.
- [x] Colección de Postman: 73/73 peticiones, 84/84 aserciones (`newman`).
- [ ] Envío real por el SMTP propio: probado solo el modo consola. Falta rellenar `SMTP_*`; al arrancar, la API verifica la conexión.
- [ ] ePayco real: probado con llaves falsas y confirmaciones firmadas por la propia prueba. Falta una transacción de prueba en el sandbox de ePayco con `PUBLIC_URL` accesible desde internet.
