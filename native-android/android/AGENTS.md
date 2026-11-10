# App Android — Kotlin + Jetpack Compose

Tienda Android de iwantmyphone. Es un proyecto Gradle **independiente**: no importa nada del Next y habla solo con la API de [`../api`](../api/AGENTS.md). Las vistas, las funcionalidades y los roles salen del Excel de alcance ([`../AGENTS.md`](../AGENTS.md) §3); la línea gráfica es la del Next (§2 del mismo documento).

## 1. Stack

| Área | Decisión | Motivo |
| --- | --- | --- |
| Lenguaje / UI | Kotlin 2.4.21 + Jetpack Compose (BOM 2026.09.00), Material 3 reconfigurado | Nativa de verdad; el tema anula radios, sombras y elevación |
| Build | AGP 9.4.1 con **Kotlin integrado**, Gradle 9.8.1 (wrapper) | Con AGP 9 no se aplica `org.jetbrains.kotlin.android`; solo los plugins de Compose y de serialización |
| SDK | `compileSdk` / `targetSdk` 37, `minSdk` 28 (Android 9) | Huella con `BiometricPrompt` + Keystore en todos los equipos soportados |
| Navegación | Navigation Compose 2.10 con rutas tipadas (`@Serializable`) | Sin cadenas de ruta a mano |
| Red | Retrofit 3 + OkHttp 5 + kotlinx.serialization | Ver §4 |
| Imágenes | Coil 3 | Con marcador propio si la URL falla |
| Persistencia | DataStore (Preferences) | Sesión cifrada y carrito; sin Room ni procesadores de anotaciones |
| Huella | `androidx.biometric` 1.1.0 + Android Keystore | Firma de clave pública (§5) |
| Pagos | Custom Tabs (`androidx.browser`) | Abre el checkout de ePayco que sirve la API |
| DI | Manual (`AppContainer`) | La app es pequeña; Hilt añadiría KSP y tiempo de build |

Versiones en [`gradle/libs.versions.toml`](gradle/libs.versions.toml), todas estables a octubre de 2026 (consultadas en Google Maven y Maven Central). `androidx.biometric` sigue en 1.1.0 porque es la última estable; las 1.2–1.4 están en alpha.

## 2. Puesta en marcha

Requisitos (ver [`../AGENTS.md`](../AGENTS.md) §1): SDK de Android Studio en `%LOCALAPPDATA%\Android\Sdk`, `ANDROID_HOME` definido y `org.gradle.java.home` apuntando al JBR de Android Studio en `~/.gradle/gradle.properties`. No hace falta instalar Gradle ni abrir Android Studio.

```powershell
# 1. La API, en otra terminal
cd native-android\api
npm run dev

# 2. El teléfono por USB, con depuración USB activada
adb devices                          # debe salir como "device"
adb reverse tcp:4000 tcp:4000        # localhost:4000 del teléfono -> PC

# 3. Compilar e instalar
cd native-android\android
.\gradlew.bat installDebug
```

`adb reverse` se pierde al desconectar el cable: si la Home se queda cargando o muestra "No hay conexión con el servidor", repítelo.

**Sin cable (Wi-Fi):** la app apunta a la IP LAN del PC. La URL se pasa por propiedad, sin tocar código:

```powershell
.\gradlew.bat installDebug -Piwmp.apiUrl=http://192.168.1.50:4000
```

El firewall de Windows tiene que dejar entrar al puerto 4000.

| Tarea | Qué hace |
| --- | --- |
| `.\gradlew.bat assembleDebug` | APK debug en `app\build\outputs\apk\debug\app-debug.apk` |
| `.\gradlew.bat installDebug` | Compila e instala en el dispositivo conectado (si hay varios, desconecta los que sobran o usa `adb -s <serie> install`) |
| `adb logcat -s iwmp` | Errores de la app (formato de respuesta inesperado, etc.) |
| `adb logcat -s okhttp.OkHttpClient` | Peticiones HTTP (solo en debug) |

El build debug se instala como `com.iwantmyphone.app.debug`, así puede convivir con el release.

### Configuración (`gradle.properties`)

| Propiedad | Uso |
| --- | --- |
| `iwmp.apiUrl` | URL de la API en debug (`http://localhost:4000` por defecto, pensada para `adb reverse`) |
| `iwmp.apiUrlRelease` | URL de la API en release. **Tiene que ser HTTPS**: el release no permite tráfico en claro |

Se compilan en `BuildConfig.API_URL`. El HTTP en claro solo está permitido en debug, a través de `src/debug/res/xml/network_security_config.xml`.

### Probado en

- Emulador `Medium_Phone_API_37.0` (Android 17, x86_64).
- Xiaomi 12T (Android 15, MIUI/HyperOS), por USB con `adb reverse`.

En ambos se comprobaron con capturas la Home y el listado contra la API real. El splash se revisó fotograma a fotograma en un vídeo del emulador.

## 3. Estructura

```
app/src/main/java/com/iwantmyphone/app/
  IwmpApp.kt            # Application + AppContainer (DI manual) + estrategia de nombres JSON
  MainActivity.kt       # FragmentActivity (BiometricPrompt lo exige), splash del sistema
  data/
    api/                # Modelos.kt (DTO), ApiService.kt (Retrofit), ApiClient.kt (OkHttp, refresh, errores)
    session/            # SessionStore (sesión cifrada + huella local), Cifrado (AES-GCM en Keystore)
    cart/               # CartStore (carrito en DataStore)
    biometric/          # Huella (claves EC en Keystore + BiometricPrompt)
    Cuenta.kt           # Login, registro con huella, login con huella, activar huella, cerrar sesión
  ui/
    IwmpRaiz.kt         # NavHost + barra inferior
    Rutas.kt            # Rutas tipadas
    Estado.kt           # Carga<T>, mensajes de error, actividad() para BiometricPrompt
    Formato.kt          # Precios, fechas y etiquetas (los mismos formatos que el Next)
    theme/Theme.kt      # Tokens, tipografía Geist, MaterialTheme sin radios
    components/         # Botón, Campo, Selector, Etiqueta, Filete, FichaProducto, ImagenProducto…
    splash/             # Logo (trazados del SVG del Next) + SplashScreen animado
    home/ catalogo/ carrito/ cuenta/ perfil/ admin/   # Pantallas (una o varias por archivo, con su ViewModel)
app/src/main/res/
  font/geist.ttf        # Geist variable (OFL, ver ../FONT-LICENSE-Geist.txt)
  drawable/ic_launcher_foreground.xml   # Corazón mordido del logo (icono adaptativo y monocromo)
```

Cada pantalla tiene un `ViewModel` con `StateFlow` cuando su estado lo justifica, o estado local con `remember` cuando es una lectura simple. Los ViewModels se crean con `viewModel { … }` y reciben el `AppContainer`.

## 4. Capa de red

- **Un método por endpoint** en `ApiService`, con el contrato de [`../api/AGENTS.md`](../api/AGENTS.md) §6.
- **`llamar()` / `llamarPagina()`** desenvuelven el sobre `{ success, data, meta }` y convierten cualquier fallo en `ApiException(status, code, message, campos)`:
  - HTTP de error: lee `error.code`, `error.message` y `details.campos` (campo → mensaje), que los formularios pintan bajo cada campo.
  - Sin red: código `RED`.
  - JSON inesperado: código `FORMATO`. El usuario ve un mensaje legible y el detalle va a `logcat -s iwmp`.
- **Nombres JSON:** la API usa snake_case y los DTO camelCase. La estrategia `NombresApi` (en `IwmpApp.kt`) convierte todo, **salvo `Meta`**, que la API manda en camelCase (`totalPages`, `hasNextPage`) igual que el Next. Un `@SerialName` no basta: la estrategia de nombres también lo transforma. Fue el primer fallo que salió al probar en el teléfono.
- **Sesión:** `BearerInterceptor` añade el access token. Ante un 401, `RefreshAuthenticator` cambia el refresh por un par nuevo **una vez** y repite la petición; si el refresh tampoco vale, cierra la sesión y la app vuelve a modo anónimo. Va sincronizado para que varias peticiones simultáneas no renueven el token a la vez.
- **Campos por rol:** `costo`, `utilidad` y `costoTotal` son opcionales en los DTO. La API solo los manda a quien tiene `costos:ver`, y la app los pinta si llegan. El formulario de producto no envía `costo` si la sesión no es de administrador (la API respondería 403).

## 5. Sesión, huella y datos locales

| Dato | Dónde | Protección |
| --- | --- | --- |
| Access + refresh token + usuario | DataStore `sesion` | Cifrado AES-256-GCM con una clave del Android Keystore (`Cifrado.kt`), no extraíble |
| Credencial de huella de este teléfono (`credencial_id`, email, nombre) | DataStore `sesion` | No es secreta; la clave privada vive en el Keystore |
| Clave privada de la huella | Android Keystore, alias `iwmp_huella` | Solo usable tras `BIOMETRIC_STRONG`; se invalida si se añade otra huella al teléfono |
| Carrito | DataStore `carrito` | Sin cifrar (no tiene datos personales) |

`allowBackup="false"`: la sesión cifrada no tendría sentido en otro teléfono, porque la clave del Keystore no viaja con el backup.

**Huella (Excel, fila 17).**

- **Registro:** `Huella.crearClaves()` genera un par EC P-256 en el Keystore y `BiometricPrompt` pide la huella para comprobar que la clave funciona. Con eso se habilita "Crear cuenta", que envía la clave **pública** en `POST /api/auth/registro`. Sin huella el botón está deshabilitado, y la API también rechaza el alta.
- **Entrar con huella:** se pide un reto (`/biometria/reto`), la huella desbloquea la firma, se firma el reto con `SHA256withECDSA` y se envía (`/biometria/login`). Cada reto vale una sola vez.
- **Cuentas creadas por un administrador** o un teléfono nuevo: tras entrar con contraseña se ofrece "Activa tu huella" (`Cuenta.activarHuella`).
- **Si la clave queda invalidada** (se añadió una huella en Ajustes): se borra la credencial local y se pide entrar con contraseña y volver a activarla.
- **Teléfono sin huella o sin lector:** el registro explica el motivo y ofrece abrir los ajustes (`ACTION_BIOMETRIC_ENROLL`).

**Carrito.** Vive en el teléfono porque un visitante sin sesión también compra hasta llegar a la pasarela (Excel, fila 10). Los precios guardados son orientativos: al pagar solo se envían `{ celular_id, cantidad }` y el total que cuenta es el que devuelve la API. Tope de 10 unidades por línea, el mismo que la API.

## 6. Navegación

Rutas tipadas en `Rutas.kt`. La **barra inferior** (Excel, fila 5) tiene Home, Productos, Carrito (con contador) y un cuarto botón que depende de la sesión:

- **Sin sesión:** icono de perfil que abre el login.
- **Con sesión:** hamburguesa que abre "Más".

Se oculta en el splash, en las pantallas de cuenta y en la pasarela. Cada pestaña conserva su estado (`saveState` / `restoreState`).

**Volver a la pasarela tras el login.** El carrito navega a `RLogin(destino = "checkout")` si no hay sesión. Tras entrar o registrarse, `trasSesion()` lleva a `RCheckout` y deja el carrito debajo en la pila.

**Pago con ePayco.** Tras `POST /api/pedidos` la pasarela abre el `checkout_url` en una Custom Tab y navega al detalle del pedido (`RMiPedido(nuevo = true)`). Ese detalle relee el pedido al volver a primer plano y cada 3 s mientras el pago siga `pendiente`, durante 3 minutos como máximo, porque la confirmación de ePayco llega a la API y no a la app. Con el pago rechazado o fallido ofrece "Reintentar el pago".

## 7. Pantallas (Excel de alcance)

| Fila | Pantalla | Archivo | Notas |
| --- | --- | --- | --- |
| 3 | Splash | `splash/SplashScreen.kt` | Ver §8 |
| 4, 17 | Login · Registro | `cuenta/CuentaScreens.kt` | Login con contraseña o huella; registro con huella obligatoria; el alta nace visitante |
| 18 | Recuperar contraseña | `cuenta/CuentaScreens.kt` | Pide el código por correo y luego código + contraseña nueva |
| 6 | Home | `home/HomeScreen.kt` | Banners a sangre con avance automático e indicador `01 —— 04 →`; masonry de promociones y más vendidos; carrusel de lanzamientos |
| 7 | Productos | `catalogo/ProductosScreen.kt` | Búsqueda con espera de 350 ms; filtros en hoja inferior (orden, solo promociones y un select por especificación, generado desde `/especificaciones/opciones`); scroll infinito |
| 8, 19 | Detalle | `catalogo/DetalleScreen.kt` | Imágenes en grid, descripción, precio, Comprar + diálogo "¿pagar o seguir mirando?", especificaciones, sugeridos, favorito. Arriba, el **resumen de ventas** (año, mes, 7 días, hoy) para vendedor y administrador; utilidad y costo solo si la API los manda |
| 9 | Carrito | `carrito/CarritoScreen.kt` | −/+; a 0 la línea desaparece; "Continuar" exige sesión |
| 10 | Pasarela | `carrito/CheckoutScreen.kt` | Productos, comprador, dirección (elegir o crear), medio de pago (los de `/metodos-pago`), resumen y "Pagar y finalizar" |
| 11, 12 | Más | `perfil/PerfilScreens.kt` | Cabecera con nombre y rol; "Mi cuenta" (compras, favoritos, direcciones) y "Administración" según `usuario.permisos` |
| — | Mis compras · detalle | `perfil/PerfilScreens.kt` | Estado del pedido y del pago, "Ir a pagar" y reintento |
| 13 | Gestión de productos | `admin/AdminProductos.kt` | Lista con miniatura, nombre, marca y precio (+costo); eliminar y "+". Detalle en lectura → "Editar" → "Actualizar"; ficha técnica en el mismo formulario |
| 14 | Gestión de pedidos | `admin/AdminVentas.kt` | Fecha, medio de pago, nº de productos, estado y cliente (+utilidad); filtro por estado y búsqueda; eliminar. En el detalle solo se edita el **estado** |
| 15 | Reporte de ventas | `admin/AdminVentas.kt` | Hoy, ayer, semana, mes y año; indicadores (+costo vendido y utilidad neta); gráfico de barras en Canvas; top 5 |
| 16 | Usuarios y permisos | `admin/AdminUsuarios.kt` | Nombre, rol y fecha de registro; alta, baja y edición; permisos del rol desde `/api/roles`. Nadie puede quitarse a sí mismo el rol ni desactivarse |

**La app no decide permisos:** muestra u oculta menús con `usuario.permisos`, que viene en el login y se refresca con `GET /api/auth/yo` al abrir "Más". La API vuelve a comprobar cada petición.

**Patrón de formulario de gestión** (Excel, filas 13 y 16): `Modo.Ver` (campos de solo lectura sobre `surface`) → "Editar" → `Modo.Editar` → "Actualizar" o "Cancelar"; `Modo.Nuevo` para el alta. Los errores de la API se pintan bajo cada campo (`details.campos`, incluido `especificaciones.<clave>`).

## 8. Línea gráfica en Compose

Tokens del Next en `ui/theme/Theme.kt` (`Iwmp.Paper`, `Ink`, `InkSoft`, `Muted`, `Line`, `Surface`, `Surface2`, `Accent` y `LogoRed`, que solo usa el corazón).

- **Tipografía Geist variable** (`res/font/geist.ttf`): pesos 300 y 400 por el eje `wght`. Todo el texto en Light; `EstiloLabel` reproduce `.u-label` (11 sp, versales, tracking .18em).
- **Material 3 sin radios** (`Shapes` a 0), sin elevación tonal y sin sombras. Los errores van en el acento azul, como en el Next.
- **Componentes propios** en `ui/components/Componentes.kt`:
  - `Boton`: borde de 1 dp; el primario se invierte a sólido al pulsar y el acento es para los CTA.
  - `Campo`: el `.u-input` del Next, con fondo `surface` en solo lectura.
  - `Selector`: dropdown que en solo lectura se pinta como un campo bloqueado.
  - `FichaProducto`: la ficha de Alpine.
  - `ImagenProducto`: con la silueta de teléfono como marcador si la URL falla.
  - `Filete`: la única separación permitida.
- **Opciones de radio y chips cuadrados:** los controles del sistema tienen esquinas redondeadas.
- **Un solo tema (claro)**, con barras del sistema claras y edge-to-edge.

**Splash animado** (Excel, fila 3). `splash/Logo.kt` dibuja el logo con los trazados del SVG del Next (`public/assets/logo.svg`, viewBox 200 × 29.9). La animación dura unos 3 s, en este orden:

1. El contorno del corazón se traza con `PathMeasure.getSegment`.
2. El corazón se rellena de rojo.
3. Aparecen los tres bocados del mordisco, con un rebote.
4. El corazón se desplaza del centro a su sitio.
5. Las letras entran con un fade-in en ola, de izquierda a derecha.

El corazón termina de colocarse **antes** de que entren las letras: si fuera a la vez, pasarían por debajo. Fue un fallo detectado al revisar los fotogramas. El splash del sistema (obligatorio desde Android 12) es blanco y sin icono, para encadenar sin salto. La navegación a la Home espera a que acabe la animación **y** a que se haya leído la sesión guardada.

## 9. Release (pendiente)

`app/build.gradle.kts` ya lo deja preparado:

- **Firma:** se lee de `keystore.properties` en la raíz del proyecto Android (en `.gitignore`, igual que `*.jks`). Contiene `storeFile`, `storePassword`, `keyAlias` y `keyPassword`. Sin ese archivo, el release sale sin firmar.
- **Reducción de código:** R8 activado (`isMinifyEnabled`, `isShrinkResources`) con reglas para kotlinx.serialization y Retrofit en `proguard-rules.pro`.
- **URL de la API:** `iwmp.apiUrlRelease`, que debe ser HTTPS.

Pasos que faltan: generar el keystore con `keytool`, publicar la API con HTTPS, `.\gradlew.bat assembleRelease` y probar el APK minificado (R8 puede romper la serialización si faltan reglas).

## 10. Estado

- [x] `.\gradlew.bat assembleDebug` sin errores ni avisos de Kotlin.
- [x] Instalada y abierta en el emulador (Android 17) y en un Xiaomi 12T (Android 15).
- [x] Home y listado verificados con capturas contra la API real; splash revisado fotograma a fotograma.
- [x] Dos fallos encontrados al probar y ya corregidos: el `meta` en camelCase rompía el listado, y las letras del splash se solapaban con el corazón.
- [ ] Recorrido manual del resto de pantallas en el teléfono: registro y login con huella, compra completa, gestión de productos, pedidos, usuarios y reporte. Están compiladas y conectadas a endpoints que pasan las pruebas de la API (`npm run smoke`), pero no se han tocado una por una en el dispositivo.
- [ ] Ajustes estéticos tras la revisión en el teléfono.
- [ ] Checkout real de ePayco: necesita llaves de sandbox y la API accesible desde internet.
- [ ] APK release firmado (§9).
