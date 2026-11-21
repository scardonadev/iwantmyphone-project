# iWantMyPhone · App nativa Android

Tienda de iPhone para Android (Kotlin + Jetpack Compose) con su propia API REST (Express + TypeScript + PostgreSQL).

| Carpeta | Contenido |
| --- | --- |
| [`android/`](android/) | Aplicación Android. **Es la carpeta que se abre en Android Studio.** |
| [`api/`](api/) | API REST que usa la app (ya está publicada; ver [API pública](#api-pública)). |
| [`postman/`](postman/) | Colección de la API (73 peticiones por rol) y entorno `Local`. |
| [`docs/`](docs/) | Manual de usuario y documento técnico (`.md` y `.docx`) con las capturas. |

## Requisitos

- **Android Studio** reciente, compatible con Android Gradle Plugin 9.4. Si al sincronizar pide una versión más nueva, actualiza Android Studio; no bajes la versión del plugin.
- **Android SDK Platform 37** (`compileSdk 37`). Android Studio ofrece instalarlo si falta.
- **JDK 25 para Gradle.** El JDK que trae Android Studio sirve. Si no lo tienes, Gradle lo descarga solo (`gradle/gradle-daemon-jvm.properties`).
- **Un teléfono o emulador con Android 9 (API 28) o superior.** Para registrarse hace falta una huella registrada en el dispositivo.

Gradle no se instala aparte: el proyecto trae su wrapper (Gradle 9.8.1), que se descarga en la primera sincronización.

## Levantar la app en Android Studio

1. Clona el repositorio:
   ```bash
   git clone https://github.com/scardonadev/iwantmyphone-project.git
   ```
2. En Android Studio: **File → Open** y elige la carpeta **`native-android/android`**, no la raíz del repositorio.
3. Espera a que termine **Gradle Sync**. La primera vez descarga Gradle y las dependencias. Android Studio crea `local.properties` con la ruta del SDK.
4. Si la sincronización falla por el JDK: **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** y elige el JDK 25 (el JBR de Android Studio).
5. Elige el dispositivo en la barra superior y pulsa **Run ▶** (configuración `app`).

La app se instala como **`com.iwantmyphone.app.debug`** y ya apunta a la API pública: no hay que levantar nada más.

### Teléfono físico (recomendado: la huella es real)

1. En el teléfono: **Ajustes → Acerca del teléfono** y toca 7 veces **Número de compilación**.
2. **Opciones de desarrollador → Depuración por USB**: actívala, conecta el cable y acepta la huella RSA del PC.
3. Comprueba que el teléfono aparezca en el selector de dispositivos de Android Studio y pulsa **Run ▶**.

### Emulador

**Device Manager → Create Virtual Device** con una imagen de API 28 o superior. Para la huella: en el emulador registra una huella en **Ajustes → Seguridad** y simula el toque desde **Extended Controls (⋯) → Fingerprint → Touch Sensor**.

## API pública

| | |
| --- | --- |
| URL base | **https://api-iwantmyphone.apps.scardona.me/api** |
| Estado | [`/api/salud`](https://api-iwantmyphone.apps.scardona.me/api/salud) |
| Ejemplo público | [`/api/home`](https://api-iwantmyphone.apps.scardona.me/api/home) |

La app toma la URL de [`android/gradle.properties`](android/gradle.properties): `iwmp.apiUrl` (debug) e `iwmp.apiUrlRelease` (release). Las dos apuntan hoy a esa dirección.

Medio de pago habilitado en el servidor: **contraentrega**. ePayco está implementado, pero desactivado hasta configurar las llaves de la cuenta.

## Usuarios de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@iwantmyphone.dev` | `Admin1234` |
| Vendedor | `vendedor@iwantmyphone.dev` | `Vendedor1234` |
| Comprador (visitante) | `visitante@iwantmyphone.dev` | `Visitante1234` |
| Comprador usado en el manual | `laura.gomez@iwantmyphone.dev` | `Comprador1234` |
| Clientes de los pedidos de ejemplo | `cliente01@example.com` … `cliente12@example.com` | `Visitante1234` |

- Estas cuentas no tienen huella registrada en tu teléfono. Entra con la contraseña y la app ofrecerá **Activa tu huella**.
- Una cuenta nueva creada desde la app nace como comprador. Solo el administrador puede cambiarle el rol (**Más → Usuarios y permisos**).
- Son credenciales de demostración de un proyecto académico. No las reutilices en otro lugar.

## Usar la API en local (opcional)

```powershell
cd native-android\api
npm install
copy .env.example .env     # completar DATABASE_URL y los secretos JWT
npm run db:setup           # crea las tablas y carga los datos de ejemplo
npm run dev                # http://localhost:4000
```

Luego, en `android/gradle.properties`, cambia `iwmp.apiUrl=http://localhost:4000` y conecta el teléfono por USB con:

```powershell
adb reverse tcp:4000 tcp:4000
```

En Postman, el entorno `Local` ya usa `http://localhost:4000`. Para probar la API pública, cambia su `baseUrl` por `https://api-iwantmyphone.apps.scardona.me`.

Detalle de la API (endpoints, variables de entorno y pruebas) en [`api/AGENTS.md`](api/AGENTS.md).

## Documentación

- [Manual de usuario](docs/manual-de-usuario.md) ([Word](docs/manual-de-usuario.docx)): uso por rol, con capturas.
- [Documento técnico](docs/documento-tecnico.md) ([Word](docs/documento-tecnico.docx)): arquitectura, requerimientos, métricas y normatividad.
