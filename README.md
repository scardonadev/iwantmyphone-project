# iwantmyphone

Catálogo de celulares con API REST, sitio público y panel de administración, en una sola
aplicación **Next.js 16** (App Router) sobre **PostgreSQL**.

## Requisitos

- Node.js 20 o superior
- Una base de datos PostgreSQL (local o remota)

## Despliegue en local

### 1. Clonar el repositorio e instalar dependencias

```bash
git clone <url-del-repositorio>
cd iwantmyphone-project
npm i
```

### 2. Crear la base de datos PostgreSQL

Sirve una instancia local o una remota (Neon, Supabase, Railway…). Basta con una base vacía;
el esquema y los datos los crea la semilla en el paso 4.

```bash
# Ejemplo local
createdb iwantmyphone
```

### 3. Configurar las variables de entorno

Copiar el archivo de ejemplo y completar los valores:

```bash
cp .env.example .env
```

```bash
# Cadena de conexión de tu base de datos
DATABASE_URL=postgresql://usuario:contraseña@host:5432/iwantmyphone
# true si el proveedor remoto exige SSL (Neon, Supabase, etc.)
DATABASE_SSL=false
# Firma de los JWT de sesión del backoffice (HS256). Mínimo 32 caracteres.
JWT_SECRET=...
```

Para generar un `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Sin `JWT_SECRET` la aplicación arranca, pero el login responde 500.

### 4. Ejecutar la semilla en la base de datos

Por ahora se ejecuta **a mano**. El archivo `src/seed/seed.sql` crea el esquema completo
(marcas, celulares, especificaciones, comentarios y usuarios) y lo llena con los datos de
ejemplo:

```bash
psql "$DATABASE_URL" -f src/seed/seed.sql
```

En Windows con PowerShell:

```powershell
psql $env:DATABASE_URL -f src/seed/seed.sql
```

También puede pegarse el contenido de `src/seed/seed.sql` en cualquier cliente SQL
(pgAdmin, DBeaver, el editor del proveedor remoto). El script es relanzable: solo crea y
siembra las tablas que no existan.

### 5. Levantar la aplicación

```bash
npm run dev
```

- Catálogo público: <http://localhost:3000>
- Backoffice: <http://localhost:3000/dashboard>

## Acceso al backoffice

La semilla crea un usuario de desarrollo ya activo:

| Campo | Valor |
| --- | --- |
| Documento | `1234567890` |
| Contraseña | `Admin1234` |

Cambiar la contraseña o eliminar ese usuario en cualquier entorno que no sea local.

## Documentación

La especificación completa del proyecto —contrato de la API, esquema de la base de datos,
sistema visual y decisiones de diseño— está en [`AGENTS.md`](AGENTS.md).
