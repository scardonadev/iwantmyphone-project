-- ==============================================================================
-- iwantmyphone — esquema + datos semilla
-- ==============================================================================
--
-- Relanzable: la inserción de datos depende de si cada tabla EXISTÍA antes de
-- esta ejecución.
--   - Tabla ausente  -> se crea y se insertan sus datos.
--   - Tabla presente -> ni se crea (CREATE TABLE IF NOT EXISTS) ni se insertan
--     sus datos, aunque esté vacía.
--
-- Por eso el estado previo se captura en el DECLARE, que se evalúa antes de
-- ejecutar el cuerpo del bloque: dentro del BEGIN las tablas ya existirían y la
-- comprobación siempre daría falso.
--
-- `celulares` es la tabla ancla del catálogo: es la única cuyas filas necesitan
-- un id ajeno (`marcas`), así que marca y catálogo se siembran juntos.
-- `especificaciones` y `comentarios` cuelgan de `celulares` y se enlazan por
-- `modelo`, no por id, así que cada una se puede sembrar por su cuenta.
-- `usuarios` (inicio de sesión del backoffice) no se relaciona con ninguna
-- otra tabla: también se siembra por libre.
--
-- Claves primarias UUID v4 (`gen_random_uuid()`, extensión pgcrypto).
--
-- La relación celular <-> especificación es 1:1 y vive en `especificaciones`:
-- `celular_id UNIQUE NOT NULL` impide que dos celulares compartan ficha técnica
-- y el ON DELETE CASCADE evita fichas huérfanas. La ficha es opcional para el
-- celular (puede no existir la fila), de ahí los LEFT JOIN de las queries.
--
-- Para recargar desde cero hay que eliminar las tablas, no vaciarlas:
-- `npm run db:seed -- --force` (hace DROP TABLE y vuelve a lanzar este archivo).
-- ==============================================================================

-- Extensión para UUID v4 (gen_random_uuid).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
    -- Estado ANTES de crear nada: es lo que decide si se insertan datos.
    faltaba_marcas           BOOLEAN := to_regclass('public.marcas')           IS NULL;
    faltaba_especificaciones BOOLEAN := to_regclass('public.especificaciones') IS NULL;
    faltaba_celulares        BOOLEAN := to_regclass('public.celulares')        IS NULL;
    faltaba_comentarios      BOOLEAN := to_regclass('public.comentarios')      IS NULL;
    faltaba_usuarios         BOOLEAN := to_regclass('public.usuarios')         IS NULL;

    v_marca_id UUID;
    v_filas    INT;

BEGIN
    -- 0. Esquema: crea solo las tablas que falten.
    --
    -- El orden importa: cada FK exige que la tabla referenciada exista ya.
    -- marcas <- celulares <- especificaciones / comentarios.
    CREATE TABLE IF NOT EXISTS marcas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nombre VARCHAR(100) NOT NULL UNIQUE,
        logo_url VARCHAR(2048),
        pais_origen VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS celulares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        marca_id UUID NOT NULL,
        images_urls TEXT,
        modelo VARCHAR(150) NOT NULL,
        precio DECIMAL(10, 2) NOT NULL,
        fecha_lanzamiento DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_celulares_marcas
            FOREIGN KEY (marca_id) REFERENCES marcas(id)
            ON UPDATE CASCADE ON DELETE RESTRICT
    );

    -- 1:1 con celulares: la FK vive aquí y es UNIQUE, así que un celular tiene
    -- como mucho una ficha y ninguna ficha se comparte entre modelos.
    CREATE TABLE IF NOT EXISTS especificaciones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        celular_id UUID NOT NULL UNIQUE,
        procesador VARCHAR(100) NOT NULL,
        ram VARCHAR(50) NOT NULL,
        almacenamiento VARCHAR(50) NOT NULL,
        pantalla VARCHAR(100) NOT NULL,
        camara VARCHAR(150) NOT NULL,
        bateria VARCHAR(50) NOT NULL,
        sistema_op VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_especificaciones_celulares
            FOREIGN KEY (celular_id) REFERENCES celulares(id)
            ON UPDATE CASCADE ON DELETE CASCADE
    );

    -- `calificacion` es SMALLINT: Postgres no tiene TINYINT, y el CHECK ya
    -- acota el rango a 1..5.
    CREATE TABLE IF NOT EXISTS comentarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        celular_id UUID NOT NULL,
        nombre VARCHAR(100) NOT NULL,
        mensaje TEXT NOT NULL,
        calificacion SMALLINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
        fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_comentarios_celulares
            FOREIGN KEY (celular_id) REFERENCES celulares(id)
            ON UPDATE CASCADE ON DELETE CASCADE
    );

    -- Inicio de sesión del backoffice. Sin FK con el catálogo y sin roles.
    -- `password_hash` guarda scrypt en formato `scrypt:N:r:p:sal:hash`
    -- (src/lib/auth/password.ts), nunca la contraseña en claro.
    -- `is_active` nace en FALSE: un alta desde `POST /api/usuarios` no entra al
    -- panel hasta que alguien la activa a mano en la BD.
    CREATE TABLE IF NOT EXISTS usuarios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        documento VARCHAR(20) NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_usuarios_documento CHECK (documento ~ '^[0-9]{6,20}$')
    );

    IF NOT (faltaba_marcas OR faltaba_especificaciones
            OR faltaba_celulares OR faltaba_comentarios OR faltaba_usuarios) THEN
        RAISE NOTICE '[seed] Las 5 tablas ya existían: no se inserta nada.';
        RETURN;
    END IF;

    IF faltaba_celulares THEN
        -- 1. Insertar o recuperar Marca 'Apple'
        INSERT INTO marcas (nombre, logo_url, pais_origen)
        VALUES ('Apple', 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', 'Estados Unidos')
        ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
        RETURNING id INTO v_marca_id;

        -- 2. Insertar Modelos de Celulares
        --
        -- images_urls: CSV de renders oficiales servidos por AppleDB
        --   https://img.appledb.dev/device@<res>/<deviceKey>/<Color>.<ext>
        -- Una URL por color disponible del modelo (res 256, formato png).
        -- La coma del deviceKey (iPhone14,2) va escapada como %2C y los espacios
        -- como %20: la columna es un CSV y un split(",") partiría la URL en dos.
        -- Los modelos anteriores al iPhone 5c solo tienen render por índice (/0.png).
        INSERT INTO celulares (marca_id, modelo, precio, fecha_lanzamiento, images_urls) VALUES
        -- iPhone (1st gen) — iPhone1,1 [0]
        (v_marca_id, 'iPhone (1st gen)', 499.00, '2007-06-29',
         'https://img.appledb.dev/device@256/iPhone1%2C1/0.png'),
        -- iPhone 3G — iPhone1,2 [0]
        (v_marca_id, 'iPhone 3G', 599.00, '2008-07-11',
         'https://img.appledb.dev/device@256/iPhone1%2C2/0.png'),
        -- iPhone 3GS — iPhone2,1 [0]
        (v_marca_id, 'iPhone 3GS', 599.00, '2009-06-19',
         'https://img.appledb.dev/device@256/iPhone2%2C1/0.png'),
        -- iPhone 4 — iPhone3,1 [0]
        (v_marca_id, 'iPhone 4', 649.00, '2010-06-24',
         'https://img.appledb.dev/device@256/iPhone3%2C1/0.png'),
        -- iPhone 4S — iPhone4,1 [0]
        (v_marca_id, 'iPhone 4S', 649.00, '2011-10-14',
         'https://img.appledb.dev/device@256/iPhone4%2C1/0.png'),
        -- iPhone 5 — iPhone5,1 [0]
        (v_marca_id, 'iPhone 5', 649.00, '2012-09-21',
         'https://img.appledb.dev/device@256/iPhone5%2C1/0.png'),
        -- iPhone 5C — iPhone5,3 [Blue, Green, Pink, White, Yellow]
        (v_marca_id, 'iPhone 5C', 549.00, '2013-09-20',
         'https://img.appledb.dev/device@256/iPhone5%2C3/Blue.png,https://img.appledb.dev/device@256/iPhone5%2C3/Green.png,https://img.appledb.dev/device@256/iPhone5%2C3/Pink.png,https://img.appledb.dev/device@256/iPhone5%2C3/White.png,https://img.appledb.dev/device@256/iPhone5%2C3/Yellow.png'),
        -- iPhone 5S — iPhone6,1 [Silver, Space Gray, Gold]
        (v_marca_id, 'iPhone 5S', 649.00, '2013-09-20',
         'https://img.appledb.dev/device@256/iPhone6%2C1/Silver.png,https://img.appledb.dev/device@256/iPhone6%2C1/Space%20Gray.png,https://img.appledb.dev/device@256/iPhone6%2C1/Gold.png'),
        -- iPhone 6 — iPhone7,2 [Silver, Space Gray, Gold]
        (v_marca_id, 'iPhone 6', 649.00, '2014-09-19',
         'https://img.appledb.dev/device@256/iPhone7%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone7%2C2/Space%20Gray.png,https://img.appledb.dev/device@256/iPhone7%2C2/Gold.png'),
        -- iPhone 6 Plus — iPhone7,1 [Silver, Space Gray, Gold]
        (v_marca_id, 'iPhone 6 Plus', 749.00, '2014-09-19',
         'https://img.appledb.dev/device@256/iPhone7%2C1/Silver.png,https://img.appledb.dev/device@256/iPhone7%2C1/Space%20Gray.png,https://img.appledb.dev/device@256/iPhone7%2C1/Gold.png'),
        -- iPhone 6S — iPhone8,1 [Gold, Rose Gold, Silver, Space Gray]
        (v_marca_id, 'iPhone 6S', 649.00, '2015-09-25',
         'https://img.appledb.dev/device@256/iPhone8%2C1/Gold.png,https://img.appledb.dev/device@256/iPhone8%2C1/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone8%2C1/Silver.png,https://img.appledb.dev/device@256/iPhone8%2C1/Space%20Gray.png'),
        -- iPhone 6S Plus — iPhone8,2 [Gold, Rose Gold, Silver, Space Gray]
        (v_marca_id, 'iPhone 6S Plus', 749.00, '2015-09-25',
         'https://img.appledb.dev/device@256/iPhone8%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone8%2C2/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone8%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone8%2C2/Space%20Gray.png'),
        -- iPhone SE (1st gen) — iPhone8,4 [Gold, Rose Gold, Silver, Space Gray]
        (v_marca_id, 'iPhone SE (1st gen)', 399.00, '2016-03-31',
         'https://img.appledb.dev/device@256/iPhone8%2C4/Gold.png,https://img.appledb.dev/device@256/iPhone8%2C4/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone8%2C4/Silver.png,https://img.appledb.dev/device@256/iPhone8%2C4/Space%20Gray.png'),
        -- iPhone 7 — iPhone9,1 [(PRODUCT)RED, Black, Gold, Jet Black, Rose Gold, Silver]
        (v_marca_id, 'iPhone 7', 649.00, '2016-09-16',
         'https://img.appledb.dev/device@256/iPhone9%2C1/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone9%2C1/Black.png,https://img.appledb.dev/device@256/iPhone9%2C1/Gold.png,https://img.appledb.dev/device@256/iPhone9%2C1/Jet%20Black.png,https://img.appledb.dev/device@256/iPhone9%2C1/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone9%2C1/Silver.png'),
        -- iPhone 7 Plus — iPhone9,2 [(PRODUCT)RED, Black, Gold, Jet Black, Rose Gold, Silver]
        (v_marca_id, 'iPhone 7 Plus', 769.00, '2016-09-16',
         'https://img.appledb.dev/device@256/iPhone9%2C2/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone9%2C2/Black.png,https://img.appledb.dev/device@256/iPhone9%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone9%2C2/Jet%20Black.png,https://img.appledb.dev/device@256/iPhone9%2C2/Rose%20Gold.png,https://img.appledb.dev/device@256/iPhone9%2C2/Silver.png'),
        -- iPhone 8 — iPhone10,1 [(PRODUCT)RED, Gold, Silver, Space Gray]
        (v_marca_id, 'iPhone 8', 699.00, '2017-09-22',
         'https://img.appledb.dev/device@256/iPhone10%2C1/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone10%2C1/Gold.png,https://img.appledb.dev/device@256/iPhone10%2C1/Silver.png,https://img.appledb.dev/device@256/iPhone10%2C1/Space%20Gray.png'),
        -- iPhone 8 Plus — iPhone10,2 [(PRODUCT)RED, Gold, Silver, Space Gray]
        (v_marca_id, 'iPhone 8 Plus', 799.00, '2017-09-22',
         'https://img.appledb.dev/device@256/iPhone10%2C2/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone10%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone10%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone10%2C2/Space%20Gray.png'),
        -- iPhone X — iPhone10,3 [Silver, Space Gray]
        (v_marca_id, 'iPhone X', 999.00, '2017-11-03',
         'https://img.appledb.dev/device@256/iPhone10%2C3/Silver.png,https://img.appledb.dev/device@256/iPhone10%2C3/Space%20Gray.png'),
        -- iPhone XS — iPhone11,2 [Gold, Silver, Space Gray]
        (v_marca_id, 'iPhone XS', 999.00, '2018-09-21',
         'https://img.appledb.dev/device@256/iPhone11%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone11%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone11%2C2/Space%20Gray.png'),
        -- iPhone XS Max — iPhone11,6 [Gold, Silver, Space Gray]
        (v_marca_id, 'iPhone XS Max', 1099.00, '2018-09-21',
         'https://img.appledb.dev/device@256/iPhone11%2C6/Gold.png,https://img.appledb.dev/device@256/iPhone11%2C6/Silver.png,https://img.appledb.dev/device@256/iPhone11%2C6/Space%20Gray.png'),
        -- iPhone XR — iPhone11,8 [(PRODUCT)RED, Black, Blue, Coral, White, Yellow]
        (v_marca_id, 'iPhone XR', 749.00, '2018-10-26',
         'https://img.appledb.dev/device@256/iPhone11%2C8/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone11%2C8/Black.png,https://img.appledb.dev/device@256/iPhone11%2C8/Blue.png,https://img.appledb.dev/device@256/iPhone11%2C8/Coral.png,https://img.appledb.dev/device@256/iPhone11%2C8/White.png,https://img.appledb.dev/device@256/iPhone11%2C8/Yellow.png'),
        -- iPhone 11 — iPhone12,1 [(PRODUCT)RED, Black, Green, Purple, White, Yellow]
        (v_marca_id, 'iPhone 11', 699.00, '2019-09-20',
         'https://img.appledb.dev/device@256/iPhone12%2C1/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone12%2C1/Black.png,https://img.appledb.dev/device@256/iPhone12%2C1/Green.png,https://img.appledb.dev/device@256/iPhone12%2C1/Purple.png,https://img.appledb.dev/device@256/iPhone12%2C1/White.png,https://img.appledb.dev/device@256/iPhone12%2C1/Yellow.png'),
        -- iPhone 11 Pro — iPhone12,3 [Gold, Midnight Green, Silver, Space Gray]
        (v_marca_id, 'iPhone 11 Pro', 999.00, '2019-09-20',
         'https://img.appledb.dev/device@256/iPhone12%2C3/Gold.png,https://img.appledb.dev/device@256/iPhone12%2C3/Midnight%20Green.png,https://img.appledb.dev/device@256/iPhone12%2C3/Silver.png,https://img.appledb.dev/device@256/iPhone12%2C3/Space%20Gray.png'),
        -- iPhone 11 Pro Max — iPhone12,5 [Gold, Midnight Green, Silver, Space Gray]
        (v_marca_id, 'iPhone 11 Pro Max', 1099.00, '2019-09-20',
         'https://img.appledb.dev/device@256/iPhone12%2C5/Gold.png,https://img.appledb.dev/device@256/iPhone12%2C5/Midnight%20Green.png,https://img.appledb.dev/device@256/iPhone12%2C5/Silver.png,https://img.appledb.dev/device@256/iPhone12%2C5/Space%20Gray.png'),
        -- iPhone SE (2nd gen) — iPhone12,8 [(PRODUCT)RED, Black, White]
        (v_marca_id, 'iPhone SE (2nd gen)', 399.00, '2020-04-24',
         'https://img.appledb.dev/device@256/iPhone12%2C8/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone12%2C8/Black.png,https://img.appledb.dev/device@256/iPhone12%2C8/White.png'),
        -- iPhone 12 mini — iPhone13,1 [Purple, (PRODUCT)RED, Black, Blue, Green, White]
        (v_marca_id, 'iPhone 12 mini', 699.00, '2020-11-13',
         'https://img.appledb.dev/device@256/iPhone13%2C1/Purple.png,https://img.appledb.dev/device@256/iPhone13%2C1/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone13%2C1/Black.png,https://img.appledb.dev/device@256/iPhone13%2C1/Blue.png,https://img.appledb.dev/device@256/iPhone13%2C1/Green.png,https://img.appledb.dev/device@256/iPhone13%2C1/White.png'),
        -- iPhone 12 — iPhone13,2 [Purple, (PRODUCT)RED, Black, Blue, Green, White]
        (v_marca_id, 'iPhone 12', 799.00, '2020-10-23',
         'https://img.appledb.dev/device@256/iPhone13%2C2/Purple.png,https://img.appledb.dev/device@256/iPhone13%2C2/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone13%2C2/Black.png,https://img.appledb.dev/device@256/iPhone13%2C2/Blue.png,https://img.appledb.dev/device@256/iPhone13%2C2/Green.png,https://img.appledb.dev/device@256/iPhone13%2C2/White.png'),
        -- iPhone 12 Pro — iPhone13,3 [Gold, Graphite, Pacific Blue, Silver]
        (v_marca_id, 'iPhone 12 Pro', 999.00, '2020-10-23',
         'https://img.appledb.dev/device@256/iPhone13%2C3/Gold.png,https://img.appledb.dev/device@256/iPhone13%2C3/Graphite.png,https://img.appledb.dev/device@256/iPhone13%2C3/Pacific%20Blue.png,https://img.appledb.dev/device@256/iPhone13%2C3/Silver.png'),
        -- iPhone 12 Pro Max — iPhone13,4 [Gold, Graphite, Pacific Blue, Silver]
        (v_marca_id, 'iPhone 12 Pro Max', 1099.00, '2020-11-13',
         'https://img.appledb.dev/device@256/iPhone13%2C4/Gold.png,https://img.appledb.dev/device@256/iPhone13%2C4/Graphite.png,https://img.appledb.dev/device@256/iPhone13%2C4/Pacific%20Blue.png,https://img.appledb.dev/device@256/iPhone13%2C4/Silver.png'),
        -- iPhone 13 mini — iPhone14,4 [Green, (PRODUCT)RED, Blue, Midnight, Pink, Starlight]
        (v_marca_id, 'iPhone 13 mini', 699.00, '2021-09-24',
         'https://img.appledb.dev/device@256/iPhone14%2C4/Green.png,https://img.appledb.dev/device@256/iPhone14%2C4/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C4/Blue.png,https://img.appledb.dev/device@256/iPhone14%2C4/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C4/Pink.png,https://img.appledb.dev/device@256/iPhone14%2C4/Starlight.png'),
        -- iPhone 13 — iPhone14,5 [Green, (PRODUCT)RED, Blue, Midnight, Pink, Starlight]
        (v_marca_id, 'iPhone 13', 799.00, '2021-09-24',
         'https://img.appledb.dev/device@256/iPhone14%2C5/Green.png,https://img.appledb.dev/device@256/iPhone14%2C5/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C5/Blue.png,https://img.appledb.dev/device@256/iPhone14%2C5/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C5/Pink.png,https://img.appledb.dev/device@256/iPhone14%2C5/Starlight.png'),
        -- iPhone 13 Pro — iPhone14,2 [Alpine Green, Gold, Graphite, Sierra Blue, Silver]
        (v_marca_id, 'iPhone 13 Pro', 999.00, '2021-09-24',
         'https://img.appledb.dev/device@256/iPhone14%2C2/Alpine%20Green.png,https://img.appledb.dev/device@256/iPhone14%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone14%2C2/Graphite.png,https://img.appledb.dev/device@256/iPhone14%2C2/Sierra%20Blue.png,https://img.appledb.dev/device@256/iPhone14%2C2/Silver.png'),
        -- iPhone 13 Pro Max — iPhone14,3 [Alpine Green, Gold, Graphite, Sierra Blue, Silver]
        (v_marca_id, 'iPhone 13 Pro Max', 1099.00, '2021-09-24',
         'https://img.appledb.dev/device@256/iPhone14%2C3/Alpine%20Green.png,https://img.appledb.dev/device@256/iPhone14%2C3/Gold.png,https://img.appledb.dev/device@256/iPhone14%2C3/Graphite.png,https://img.appledb.dev/device@256/iPhone14%2C3/Sierra%20Blue.png,https://img.appledb.dev/device@256/iPhone14%2C3/Silver.png'),
        -- iPhone SE (3rd gen) — iPhone14,6 [(PRODUCT)RED, Midnight, Starlight]
        (v_marca_id, 'iPhone SE (3rd gen)', 429.00, '2022-03-18',
         'https://img.appledb.dev/device@256/iPhone14%2C6/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C6/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C6/Starlight.png'),
        -- iPhone 14 — iPhone14,7 [Yellow, (PRODUCT)RED, Blue, Midnight, Purple, Starlight]
        (v_marca_id, 'iPhone 14', 799.00, '2022-09-16',
         'https://img.appledb.dev/device@256/iPhone14%2C7/Yellow.png,https://img.appledb.dev/device@256/iPhone14%2C7/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C7/Blue.png,https://img.appledb.dev/device@256/iPhone14%2C7/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C7/Purple.png,https://img.appledb.dev/device@256/iPhone14%2C7/Starlight.png'),
        -- iPhone 14 Plus — iPhone14,8 [Yellow, (PRODUCT)RED, Blue, Midnight, Purple, Starlight]
        (v_marca_id, 'iPhone 14 Plus', 899.00, '2022-10-07',
         'https://img.appledb.dev/device@256/iPhone14%2C8/Yellow.png,https://img.appledb.dev/device@256/iPhone14%2C8/(PRODUCT)RED.png,https://img.appledb.dev/device@256/iPhone14%2C8/Blue.png,https://img.appledb.dev/device@256/iPhone14%2C8/Midnight.png,https://img.appledb.dev/device@256/iPhone14%2C8/Purple.png,https://img.appledb.dev/device@256/iPhone14%2C8/Starlight.png'),
        -- iPhone 14 Pro — iPhone15,2 [Deep Purple, Gold, Silver, Space Black]
        (v_marca_id, 'iPhone 14 Pro', 999.00, '2022-09-16',
         'https://img.appledb.dev/device@256/iPhone15%2C2/Deep%20Purple.png,https://img.appledb.dev/device@256/iPhone15%2C2/Gold.png,https://img.appledb.dev/device@256/iPhone15%2C2/Silver.png,https://img.appledb.dev/device@256/iPhone15%2C2/Space%20Black.png'),
        -- iPhone 14 Pro Max — iPhone15,3 [Deep Purple, Gold, Silver, Space Black]
        (v_marca_id, 'iPhone 14 Pro Max', 1099.00, '2022-09-16',
         'https://img.appledb.dev/device@256/iPhone15%2C3/Deep%20Purple.png,https://img.appledb.dev/device@256/iPhone15%2C3/Gold.png,https://img.appledb.dev/device@256/iPhone15%2C3/Silver.png,https://img.appledb.dev/device@256/iPhone15%2C3/Space%20Black.png'),
        -- iPhone 15 — iPhone15,4 [Black, Blue, Green, Pink, Yellow]
        (v_marca_id, 'iPhone 15', 799.00, '2023-09-22',
         'https://img.appledb.dev/device@256/iPhone15%2C4/Black.png,https://img.appledb.dev/device@256/iPhone15%2C4/Blue.png,https://img.appledb.dev/device@256/iPhone15%2C4/Green.png,https://img.appledb.dev/device@256/iPhone15%2C4/Pink.png,https://img.appledb.dev/device@256/iPhone15%2C4/Yellow.png'),
        -- iPhone 15 Plus — iPhone15,5 [Black, Blue, Green, Pink, Yellow]
        (v_marca_id, 'iPhone 15 Plus', 899.00, '2023-09-22',
         'https://img.appledb.dev/device@256/iPhone15%2C5/Black.png,https://img.appledb.dev/device@256/iPhone15%2C5/Blue.png,https://img.appledb.dev/device@256/iPhone15%2C5/Green.png,https://img.appledb.dev/device@256/iPhone15%2C5/Pink.png,https://img.appledb.dev/device@256/iPhone15%2C5/Yellow.png'),
        -- iPhone 15 Pro — iPhone16,1 [Black Titanium, Blue Titanium, Natural Titanium, White Titanium]
        (v_marca_id, 'iPhone 15 Pro', 999.00, '2023-09-22',
         'https://img.appledb.dev/device@256/iPhone16%2C1/Black%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C1/Blue%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C1/Natural%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C1/White%20Titanium.png'),
        -- iPhone 15 Pro Max — iPhone16,2 [Black Titanium, Blue Titanium, Natural Titanium, White Titanium]
        (v_marca_id, 'iPhone 15 Pro Max', 1199.00, '2023-09-22',
         'https://img.appledb.dev/device@256/iPhone16%2C2/Black%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C2/Blue%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C2/Natural%20Titanium.png,https://img.appledb.dev/device@256/iPhone16%2C2/White%20Titanium.png'),
        -- iPhone 16 — iPhone17,3 [Black, Pink, Teal, Ultramarine, White]
        (v_marca_id, 'iPhone 16', 799.00, '2024-09-20',
         'https://img.appledb.dev/device@256/iPhone17%2C3/Black.png,https://img.appledb.dev/device@256/iPhone17%2C3/Pink.png,https://img.appledb.dev/device@256/iPhone17%2C3/Teal.png,https://img.appledb.dev/device@256/iPhone17%2C3/Ultramarine.png,https://img.appledb.dev/device@256/iPhone17%2C3/White.png'),
        -- iPhone 16 Plus — iPhone17,4 [Black, Pink, Teal, Ultramarine, White]
        (v_marca_id, 'iPhone 16 Plus', 899.00, '2024-09-20',
         'https://img.appledb.dev/device@256/iPhone17%2C4/Black.png,https://img.appledb.dev/device@256/iPhone17%2C4/Pink.png,https://img.appledb.dev/device@256/iPhone17%2C4/Teal.png,https://img.appledb.dev/device@256/iPhone17%2C4/Ultramarine.png,https://img.appledb.dev/device@256/iPhone17%2C4/White.png'),
        -- iPhone 16 Pro — iPhone17,1 [Black Titanium, Desert Titanium, Natural Titanium, White Titanium]
        (v_marca_id, 'iPhone 16 Pro', 999.00, '2024-09-20',
         'https://img.appledb.dev/device@256/iPhone17%2C1/Black%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C1/Desert%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C1/Natural%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C1/White%20Titanium.png'),
        -- iPhone 16 Pro Max — iPhone17,2 [Black Titanium, Desert Titanium, Natural Titanium, White Titanium]
        (v_marca_id, 'iPhone 16 Pro Max', 1199.00, '2024-09-20',
         'https://img.appledb.dev/device@256/iPhone17%2C2/Black%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C2/Desert%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C2/Natural%20Titanium.png,https://img.appledb.dev/device@256/iPhone17%2C2/White%20Titanium.png'),
        -- iPhone 16e — iPhone17,5 [Black, White]
        (v_marca_id, 'iPhone 16e', 599.00, '2025-02-28',
         'https://img.appledb.dev/device@256/iPhone17%2C5/Black.png,https://img.appledb.dev/device@256/iPhone17%2C5/White.png'),
        -- iPhone 17 — iPhone18,3 [Black, Lavender, Mist Blue, Sage, White]
        (v_marca_id, 'iPhone 17', 799.00, '2025-09-19',
         'https://img.appledb.dev/device@256/iPhone18%2C3/Black.png,https://img.appledb.dev/device@256/iPhone18%2C3/Lavender.png,https://img.appledb.dev/device@256/iPhone18%2C3/Mist%20Blue.png,https://img.appledb.dev/device@256/iPhone18%2C3/Sage.png,https://img.appledb.dev/device@256/iPhone18%2C3/White.png'),
        -- iPhone Air — iPhone18,4 [Cloud White, Light Gold, Sky Blue, Space Black]
        (v_marca_id, 'iPhone Air', 999.00, '2025-09-19',
         'https://img.appledb.dev/device@256/iPhone18%2C4/Cloud%20White.png,https://img.appledb.dev/device@256/iPhone18%2C4/Light%20Gold.png,https://img.appledb.dev/device@256/iPhone18%2C4/Sky%20Blue.png,https://img.appledb.dev/device@256/iPhone18%2C4/Space%20Black.png'),
        -- iPhone 17 Pro — iPhone18,1 [Cosmic Orange, Deep Blue, Silver]
        (v_marca_id, 'iPhone 17 Pro', 1099.00, '2025-09-19',
         'https://img.appledb.dev/device@256/iPhone18%2C1/Cosmic%20Orange.png,https://img.appledb.dev/device@256/iPhone18%2C1/Deep%20Blue.png,https://img.appledb.dev/device@256/iPhone18%2C1/Silver.png'),
        -- iPhone 17 Pro Max — iPhone18,1 (render del iPhone 17 Pro: AppleDB aún no publica el suyo) [Cosmic Orange, Deep Blue, Silver]
        (v_marca_id, 'iPhone 17 Pro Max', 1199.00, '2025-09-19',
         'https://img.appledb.dev/device@256/iPhone18%2C1/Cosmic%20Orange.png,https://img.appledb.dev/device@256/iPhone18%2C1/Deep%20Blue.png,https://img.appledb.dev/device@256/iPhone18%2C1/Silver.png'),
        -- iPhone 17e — iPhone18,5 [Black, Soft Pink, White]
        (v_marca_id, 'iPhone 17e', 599.00, '2026-03-11',
         'https://img.appledb.dev/device@256/iPhone18%2C5/Black.png,https://img.appledb.dev/device@256/iPhone18%2C5/Soft%20Pink.png,https://img.appledb.dev/device@256/iPhone18%2C5/White.png');
    ELSE
        RAISE NOTICE '[seed] celulares ya existía: no se insertan marcas ni celulares.';
    END IF;

    IF faltaba_especificaciones THEN
        -- 3. Insertar Especificaciones Técnicas (una ficha por celular)
        --
        -- Se enlazan por `modelo` (único en el catálogo) con el mismo INSERT ...
        -- SELECT que usan los comentarios: así no hay que capturar los 52 UUID en
        -- variables ni depender del orden de inserción.
        --
        -- Las variantes de una misma generación (6 / 6 Plus, 17 Pro / Pro Max…)
        -- repiten los valores de su generación: antes compartían fila y ahora
        -- `celular_id UNIQUE` obliga a que cada una tenga la suya.
        INSERT INTO especificaciones (celular_id, procesador, ram, almacenamiento, pantalla, camara, bateria, sistema_op)
        SELECT c.id, v.procesador, v.ram, v.almacenamiento, v.pantalla, v.camara, v.bateria, v.sistema_op
        FROM celulares c
        JOIN (VALUES
            ('iPhone (1st gen)', 'Samsung 32-bit RISC 412 MHz', '128 MB', '4GB / 8GB / 16GB', '3.5" LCD (320x480)', '2 MP', '1400 mAh', 'iPhone OS 1.0'),
            ('iPhone 3G', 'Samsung 32-bit RISC 412 MHz', '128 MB', '8GB / 16GB', '3.5" LCD (320x480)', '2 MP', '1150 mAh', 'iPhone OS 2.0'),
            ('iPhone 3GS', 'Samsung Cortex-A8 600 MHz', '256 MB', '8GB / 16GB / 32GB', '3.5" LCD (320x480)', '3 MP Video VGA', '1219 mAh', 'iPhone OS 3.0'),
            ('iPhone 4', 'Apple A4', '512 MB', '8GB / 16GB / 32GB', '3.5" Retina LCD (960x640)', '5 MP + VGA frontal', '1420 mAh', 'iOS 4.0'),
            ('iPhone 4S', 'Apple A5 Dual-Core', '512 MB', '8GB / 16GB / 32GB / 64GB', '3.5" Retina LCD (960x640)', '8 MP 1080p + VGA frontal', '1432 mAh', 'iOS 5.0'),
            ('iPhone 5', 'Apple A6', '1 GB', '16GB / 32GB / 64GB', '4.0" Retina LCD (1136x640)', '8 MP + 1.2 MP frontal', '1440 mAh', 'iOS 6.0'),
            ('iPhone 5C', 'Apple A6', '1 GB', '16GB / 32GB / 64GB', '4.0" Retina LCD (1136x640)', '8 MP + 1.2 MP frontal', '1440 mAh', 'iOS 6.0'),
            ('iPhone 5S', 'Apple A7 (64-bit)', '1 GB', '16GB / 32GB / 64GB', '4.0" Retina LCD (1136x640)', '8 MP TrueTone + 1.2 MP frontal', '1560 mAh', 'iOS 7.0'),
            ('iPhone 6', 'Apple A8', '1 GB', '16GB / 32GB / 64GB / 128GB', '4.7" Retina HD (1334x750)', '8 MP iSight + 1.2 MP frontal', '1810 mAh', 'iOS 8.0'),
            ('iPhone 6 Plus', 'Apple A8', '1 GB', '16GB / 32GB / 64GB / 128GB', '4.7" Retina HD (1334x750)', '8 MP iSight + 1.2 MP frontal', '1810 mAh', 'iOS 8.0'),
            ('iPhone 6S', 'Apple A9', '2 GB', '16GB / 32GB / 64GB / 128GB', '4.7" Retina HD (1334x750)', '12 MP 4K + 5 MP frontal', '1715 mAh', 'iOS 9.0'),
            ('iPhone 6S Plus', 'Apple A9', '2 GB', '16GB / 32GB / 64GB / 128GB', '4.7" Retina HD (1334x750)', '12 MP 4K + 5 MP frontal', '1715 mAh', 'iOS 9.0'),
            ('iPhone SE (1st gen)', 'Apple A9', '2 GB', '16GB / 32GB / 64GB / 128GB', '4.0" Retina LCD (1136x640)', '12 MP 4K + 1.2 MP frontal', '1624 mAh', 'iOS 9.3'),
            ('iPhone 7', 'Apple A10 Fusion', '2 GB', '32GB / 128GB / 256GB', '4.7" Retina HD (1334x750)', '12 MP f/1.8 + 7 MP frontal', '1960 mAh', 'iOS 10.0'),
            ('iPhone 7 Plus', 'Apple A10 Fusion', '2 GB', '32GB / 128GB / 256GB', '4.7" Retina HD (1334x750)', '12 MP f/1.8 + 7 MP frontal', '1960 mAh', 'iOS 10.0'),
            ('iPhone 8', 'Apple A11 Bionic', '2 GB', '64GB / 128GB / 256GB', '4.7" Retina HD (1334x750)', '12 MP 4K 60fps + 7 MP frontal', '1821 mAh', 'iOS 11.0'),
            ('iPhone 8 Plus', 'Apple A11 Bionic', '2 GB', '64GB / 128GB / 256GB', '4.7" Retina HD (1334x750)', '12 MP 4K 60fps + 7 MP frontal', '1821 mAh', 'iOS 11.0'),
            ('iPhone X', 'Apple A11 Bionic', '3 GB', '64GB / 256GB', '5.8" Super Retina OLED (2436x1125)', 'Doble 12 MP (Angular + Tele) + 7 MP TrueDepth', '2716 mAh', 'iOS 11.0.1'),
            ('iPhone XS', 'Apple A12 Bionic', '4 GB', '64GB / 256GB / 512GB', '5.8" Super Retina OLED (2436x1125)', 'Doble 12 MP (OIS) + 7 MP TrueDepth', '2658 mAh', 'iOS 12.0'),
            ('iPhone XS Max', 'Apple A12 Bionic', '4 GB', '64GB / 256GB / 512GB', '5.8" Super Retina OLED (2436x1125)', 'Doble 12 MP (OIS) + 7 MP TrueDepth', '2658 mAh', 'iOS 12.0'),
            ('iPhone XR', 'Apple A12 Bionic', '3 GB', '64GB / 128GB / 256GB', '6.1" Liquid Retina LCD (1792x828)', '12 MP f/1.8 + 7 MP TrueDepth', '2942 mAh', 'iOS 12.0'),
            ('iPhone 11', 'Apple A13 Bionic', '4 GB', '64GB / 128GB / 256GB', '6.1" Liquid Retina LCD (1792x828)', 'Doble 12 MP (Angular + Ultra) + 12 MP frontal', '3110 mAh', 'iOS 13.0'),
            ('iPhone 11 Pro', 'Apple A13 Bionic', '4 GB', '64GB / 256GB / 512GB', '5.8" Super Retina XDR OLED', 'Triple 12 MP (Wide, Ultra, Tele) + 12 MP frontal', '3046 mAh', 'iOS 13.0'),
            ('iPhone 11 Pro Max', 'Apple A13 Bionic', '4 GB', '64GB / 256GB / 512GB', '5.8" Super Retina XDR OLED', 'Triple 12 MP (Wide, Ultra, Tele) + 12 MP frontal', '3046 mAh', 'iOS 13.0'),
            ('iPhone SE (2nd gen)', 'Apple A13 Bionic', '3 GB', '64GB / 128GB / 256GB', '4.7" Retina HD LCD', '12 MP 4K + 7 MP frontal', '1821 mAh', 'iOS 13.4'),
            ('iPhone 12 mini', 'Apple A14 Bionic (5G)', '4 GB', '64GB / 128GB / 256GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP + 12 MP TrueDepth', '2815 mAh', 'iOS 14.1'),
            ('iPhone 12', 'Apple A14 Bionic (5G)', '4 GB', '64GB / 128GB / 256GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP + 12 MP TrueDepth', '2815 mAh', 'iOS 14.1'),
            ('iPhone 12 Pro', 'Apple A14 Bionic (5G)', '6 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR + LiDAR', 'Triple 12 MP + Escáner LiDAR + 12 MP frontal', '2815 mAh', 'iOS 14.1'),
            ('iPhone 12 Pro Max', 'Apple A14 Bionic (5G)', '6 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR + LiDAR', 'Triple 12 MP + Escáner LiDAR + 12 MP frontal', '2815 mAh', 'iOS 14.1'),
            ('iPhone 13 mini', 'Apple A15 Bionic', '4 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP (Sensor-Shift OIS) + 12 MP frontal', '3227 mAh', 'iOS 15.0'),
            ('iPhone 13', 'Apple A15 Bionic', '4 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP (Sensor-Shift OIS) + 12 MP frontal', '3227 mAh', 'iOS 15.0'),
            ('iPhone 13 Pro', 'Apple A15 Bionic', '6 GB', '128GB / 256GB / 512GB / 1TB', '6.1" ProMotion 120Hz OLED', 'Triple 12 MP Macro + LiDAR + 12 MP frontal', '3095 mAh', 'iOS 15.0'),
            ('iPhone 13 Pro Max', 'Apple A15 Bionic', '6 GB', '128GB / 256GB / 512GB / 1TB', '6.1" ProMotion 120Hz OLED', 'Triple 12 MP Macro + LiDAR + 12 MP frontal', '3095 mAh', 'iOS 15.0'),
            ('iPhone SE (3rd gen)', 'Apple A15 Bionic (5G)', '4 GB', '64GB / 128GB / 256GB', '4.7" Retina HD LCD', '12 MP f/1.8 + 7 MP frontal', '2018 mAh', 'iOS 15.4'),
            ('iPhone 14', 'Apple A15 Bionic (5-core GPU)', '6 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP Photonic Engine + 12 MP frontal', '3279 mAh', 'iOS 16.0'),
            ('iPhone 14 Plus', 'Apple A15 Bionic (5-core GPU)', '6 GB', '128GB / 256GB / 512GB', '6.1" Super Retina XDR OLED', 'Doble 12 MP Photonic Engine + 12 MP frontal', '3279 mAh', 'iOS 16.0'),
            ('iPhone 14 Pro', 'Apple A16 Bionic', '6 GB', '128GB / 256GB / 512GB / 1TB', '6.1" Dynamic Island 120Hz OLED', '48 MP Main + 12 MP UW + 12 MP Tele 3x + 12 MP frontal', '3200 mAh', 'iOS 16.0'),
            ('iPhone 14 Pro Max', 'Apple A16 Bionic', '6 GB', '128GB / 256GB / 512GB / 1TB', '6.1" Dynamic Island 120Hz OLED', '48 MP Main + 12 MP UW + 12 MP Tele 3x + 12 MP frontal', '3200 mAh', 'iOS 16.0'),
            ('iPhone 15', 'Apple A16 Bionic', '6 GB', '128GB / 256GB / 512GB', '6.1" Dynamic Island USB-C OLED', '48 MP Main + 12 MP UW + 12 MP TrueDepth', '3349 mAh', 'iOS 17.0'),
            ('iPhone 15 Plus', 'Apple A16 Bionic', '6 GB', '128GB / 256GB / 512GB', '6.1" Dynamic Island USB-C OLED', '48 MP Main + 12 MP UW + 12 MP TrueDepth', '3349 mAh', 'iOS 17.0'),
            ('iPhone 15 Pro', 'Apple A17 Pro (3nm)', '8 GB', '128GB / 256GB / 512GB / 1TB', '6.1" Titanium ProMotion 120Hz', '48 MP + 12 MP UW + 12 MP Tele 3x/5x + USB 3.0', '3274 mAh', 'iOS 17.0'),
            ('iPhone 15 Pro Max', 'Apple A17 Pro (3nm)', '8 GB', '128GB / 256GB / 512GB / 1TB', '6.1" Titanium ProMotion 120Hz', '48 MP + 12 MP UW + 12 MP Tele 3x/5x + USB 3.0', '3274 mAh', 'iOS 17.0'),
            ('iPhone 16', 'Apple A18 (Apple Intelligence)', '8 GB', '128GB / 256GB / 512GB', '6.1" OLED + Camera Control', '48 MP Fusion + 12 MP Ultra Wide', '3561 mAh', 'iOS 18.0'),
            ('iPhone 16 Plus', 'Apple A18 (Apple Intelligence)', '8 GB', '128GB / 256GB / 512GB', '6.1" OLED + Camera Control', '48 MP Fusion + 12 MP Ultra Wide', '3561 mAh', 'iOS 18.0'),
            ('iPhone 16 Pro', 'Apple A18 Pro', '8 GB', '128GB / 256GB / 512GB / 1TB', '6.3" Borderless ProMotion 120Hz', '48 MP Fusion + 48 MP UW + 12 MP Tele 5x + 4K 120fps', '3582 mAh', 'iOS 18.0'),
            ('iPhone 16 Pro Max', 'Apple A18 Pro', '8 GB', '128GB / 256GB / 512GB / 1TB', '6.3" Borderless ProMotion 120Hz', '48 MP Fusion + 48 MP UW + 12 MP Tele 5x + 4K 120fps', '3582 mAh', 'iOS 18.0'),
            ('iPhone 16e', 'Apple A18', '8 GB', '128GB / 256GB', '6.1" OLED Dynamic Island', '48 MP Single Fusion Camera', '3200 mAh', 'iOS 18.3'),
            ('iPhone 17', 'Apple A19 (3nm)', '8 GB', '128GB / 256GB / 512GB', '6.1" OLED ProMotion 120Hz', '48 MP Main + 48 MP Ultra Wide', '3600 mAh', 'iOS 26.0'),
            ('iPhone Air', 'Apple A19 Pro', '8 GB', '256GB / 512GB / 1TB', '6.6" Slim OLED 120Hz (eSIM-only)', '48 MP Main Fusion + 24 MP TrueDepth', '3100 mAh', 'iOS 26.0'),
            ('iPhone 17 Pro', 'Apple A19 Pro', '12 GB', '256GB / 512GB / 1TB / 2TB', '6.3" ProMotion 120Hz Anti-reflective', 'Triple 48 MP (Main, Ultra-Wide, Telephoto 5x)', '3800 mAh', 'iOS 26.0'),
            ('iPhone 17 Pro Max', 'Apple A19 Pro', '12 GB', '256GB / 512GB / 1TB / 2TB', '6.3" ProMotion 120Hz Anti-reflective', 'Triple 48 MP (Main, Ultra-Wide, Telephoto 5x)', '3800 mAh', 'iOS 26.0'),
            ('iPhone 17e', 'Apple A19', '8 GB', '128GB / 256GB', '6.1" OLED Dynamic Island + MagSafe', '48 MP Main + 12 MP Frontal', '3300 mAh', 'iOS 26.0')
        ) AS v (modelo, procesador, ram, almacenamiento, pantalla, camara, bateria, sistema_op) ON v.modelo = c.modelo;

        GET DIAGNOSTICS v_filas = ROW_COUNT;
        IF v_filas = 0 THEN
            RAISE WARNING '[seed] especificaciones se ha creado vacía: ningún `modelo` del catálogo coincide con los del seed. Recarga con: npm run db:seed -- --force';
        END IF;
    ELSE
        RAISE NOTICE '[seed] especificaciones ya existía: no se insertan fichas técnicas.';
    END IF;

    IF faltaba_comentarios THEN
        -- 4. Insertar Comentarios (valoraciones de usuarios)
        --
        -- Uno o dos por celular. Se enlazan por `modelo` (único en el catálogo)
        -- para no tener que capturar los 52 UUID en variables.
        -- `fecha` se calcula como fecha_lanzamiento + desfase, de modo que ninguna
        -- valoración quede antes del lanzamiento del dispositivo que valora.
        INSERT INTO comentarios (celular_id, nombre, mensaje, calificacion, fecha)
        SELECT c.id, v.nombre, v.mensaje, v.calificacion, c.fecha_lanzamiento + v.desfase::INTERVAL
        FROM celulares c
        JOIN (VALUES
            ('iPhone (1st gen)', 'Diego Salazar', 'Hice fila seis horas frente a la tienda y valió cada minuto. Todavía lo guardo en su caja original.', 5, '12 days 10:24'),
            ('iPhone (1st gen)', 'Laura Ferrer', 'Navegar por internet de verdad en un teléfono es magia, pero quedarse en EDGE y sin tienda de aplicaciones se siente incompleto.', 3, '48 days 19:05'),
            ('iPhone 3G', 'Andrés Villalba', 'El salto a 3G y la App Store lo cambian todo. La carcasa plástica cruje un poco, pero por fin es un teléfono completo.', 4, '21 days 16:40'),
            ('iPhone 3GS', 'Paula Restrepo', 'La S de speed no es marketing: abre todo al instante comparado con el 3G. La cámara de 3 MP con video es un lujo.', 5, '9 days 11:12'),
            ('iPhone 3GS', 'Tomás Iriarte', 'Muy fluido, pero la batería no aguanta un día completo si uso GPS. Toca cargarlo a media tarde.', 3, '73 days 20:31'),
            ('iPhone 4', 'Camila Ochoa', 'La pantalla Retina es de otro planeta, no se distingue un solo píxel. El diseño de vidrio y acero sigue siendo el más bonito que han hecho.', 5, '14 days 09:47'),
            ('iPhone 4', 'Ricardo Peña', 'Precioso, pero si lo sostengo tapando la esquina inferior izquierda pierdo señal. Tuve que ponerle funda obligada.', 2, '39 days 22:18'),
            ('iPhone 4S', 'Valentina Cortés', 'Siri en español todavía se equivoca, pero la cámara de 8 MP y el A5 lo vuelven una compra redonda.', 4, '18 days 13:55'),
            ('iPhone 4S', 'Julián Mesa', 'Idéntico al 4 por fuera, así que nadie nota que lo cambié. Por dentro sí se siente el doble de rápido.', 4, '64 days 08:26'),
            ('iPhone 5', 'Sofía Aguirre', 'La pantalla de 4 pulgadas y el cuerpo de aluminio lo hacen increíblemente liviano. El cambio de conector a Lightning sí dolió en el bolsillo.', 4, '11 days 17:09'),
            ('iPhone 5C', 'Mariana Duarte', 'Me encanta el azul, se ve alegre y el plástico es sólido, no barato. Por dentro es un 5, y para mi uso sobra.', 4, '16 days 12:03'),
            ('iPhone 5C', 'Esteban Rojas', 'Esperaba un precio mucho más bajo para ser el modelo económico. Buen teléfono, mala relación de precio.', 3, '55 days 21:44'),
            ('iPhone 5S', 'Natalia Bermúdez', 'Touch ID funciona a la primera casi siempre y ya no vuelvo a escribir el código. El dorado envejeció mejor de lo que pensé.', 5, '7 days 10:38'),
            ('iPhone 5S', 'Felipe Naranjo', 'Primer procesador de 64 bits en un teléfono y se nota en los juegos. Le pido más batería y nada más.', 4, '41 days 18:52'),
            ('iPhone 6', 'Carolina Ospina', 'El salto a 4.7 pulgadas se agradece para leer, aunque perdí el manejo con una sola mano. Muy delgado y cómodo.', 4, '19 days 15:21'),
            ('iPhone 6 Plus', 'Gabriel Toro', 'La batería de este tamaño es otra historia, me dura dos días con uso normal. Ver video en 5.5 pulgadas es un gustazo.', 5, '23 days 09:14'),
            ('iPhone 6 Plus', 'Adriana Lemus', 'Buen teléfono pero es demasiado grande para mi mano y el aluminio se dobla si lo dejo en el bolsillo trasero. Cuidado con eso.', 2, '87 days 20:07'),
            ('iPhone 6S', 'Manuel Castrillón', '3D Touch es más útil de lo que parecía y la cámara de 12 MP con 4K es un salto real frente al 6.', 4, '13 days 11:49'),
            ('iPhone 6S Plus', 'Daniela Quiroga', 'La estabilización óptica salva todas mis fotos de conciertos. Pesado, sí, pero la pantalla lo compensa.', 5, '26 days 19:33'),
            ('iPhone 6S Plus', 'Óscar Villamizar', 'Rendimiento excelente, pero después de la actualización lo sentí más lento. La batería tampoco es la de antes.', 3, '96 days 08:58'),
            ('iPhone SE (1st gen)', 'Lucía Pardo', 'Potencia del 6S en el cuerpo del 5S: exactamente lo que pedía quien no quiere un teléfono gigante.', 5, '10 days 14:26'),
            ('iPhone SE (1st gen)', 'Sebastián Arenas', 'El mejor precio de toda la línea y la cámara es la misma del 6S. Le falta Touch ID de segunda generación, nada más.', 4, '52 days 21:11'),
            ('iPhone 7', 'Andrea Salcedo', 'Que sea resistente al agua me salvó dos veces. Quitar el conector de audífonos sigue pareciéndome innecesario.', 3, '15 days 16:47'),
            ('iPhone 7', 'Mateo Ibarra', 'El botón de inicio háptico se siente raro los primeros días y después ni lo notas. Muy rápido y silencioso.', 4, '44 days 10:19'),
            ('iPhone 7 Plus', 'Isabela Márquez', 'El modo retrato con la doble cámara hace fotos que parecen de reflex. Por eso pagué el modelo grande.', 5, '20 days 18:04'),
            ('iPhone 8', 'Alejandro Gómez', 'Carga inalámbrica y vidrio en la espalda, pero se ve igual que el 6 de hace cuatro años. Sólido y aburrido.', 3, '17 days 12:36'),
            ('iPhone 8 Plus', 'Verónica Lozano', 'El A11 vuela y la cámara doble es la misma calidad del X por menos dinero. Prefiero el Touch ID de siempre.', 5, '12 days 09:53'),
            ('iPhone 8 Plus', 'Hernán Castaño', 'Buen equipo, pero el vidrio trasero se rompe con cualquier caída. La reparación cuesta una fortuna.', 3, '78 days 20:41'),
            ('iPhone X', 'Juliana Escobar', 'Sin botón de inicio y con pantalla completa: se siente el futuro. Face ID acierta hasta con gafas oscuras.', 5, '8 days 11:27'),
            ('iPhone X', 'Rodrigo Alzate', 'La pantalla OLED es espectacular, pero mil dólares por un teléfono con muesca me sigue pareciendo demasiado.', 4, '58 days 19:16'),
            ('iPhone XS', 'Patricia Villegas', 'Mismo diseño del X con mejor cámara y más velocidad. Actualización tranquila, sin sorpresas.', 4, '22 days 15:08'),
            ('iPhone XS Max', 'Fernando Acosta', 'La pantalla de 6.5 pulgadas es enorme y perfecta para trabajar. El precio también es enorme.', 4, '14 days 10:45'),
            ('iPhone XS Max', 'Sara Gutiérrez', 'Impresionante para ver series, pero no me cabe en ningún bolsillo. Terminé usándolo con dos manos siempre.', 3, '69 days 21:52'),
            ('iPhone XR', 'Mónica Zapata', 'El coral es hermoso y la batería es la mejor que he tenido en un iPhone. La pantalla LCD no se ve mal para nada.', 5, '11 days 13:31'),
            ('iPhone XR', 'Nicolás Herrera', 'Excelente relación precio calidad, aunque los bordes de la pantalla son notoriamente más gruesos que en el XS.', 4, '47 days 18:23'),
            ('iPhone 11', 'Carla Benítez', 'La cámara ultra gran angular cambió mi forma de tomar fotos de paisajes. El modo noche funciona de verdad.', 5, '9 days 12:14'),
            ('iPhone 11', 'Iván Montoya', 'Batería para todo el día y precio razonable. Lo único: 64 GB en el modelo base se llenan en un mes.', 4, '61 days 20:29'),
            ('iPhone 11 Pro', 'Elena Cardona', 'Tres cámaras que se ven idénticas entre sí, algo raro de lograr. La pantalla XDR es lo mejor del equipo.', 5, '16 days 09:36'),
            ('iPhone 11 Pro Max', 'Santiago Ruiz', 'Verde medianoche y batería infinita. Lo compré para viajar y no he tenido que cargarlo en un vuelo largo.', 5, '13 days 17:42'),
            ('iPhone 11 Pro Max', 'Ana María Solís', 'Cámara impecable, pero el peso se siente en la mano después de un rato largo de uso.', 4, '82 days 11:07'),
            ('iPhone SE (2nd gen)', 'Jorge Betancur', 'El A13 por menos de cuatrocientos dólares no tiene competencia. Perfecto para quien viene de un 6 o un 7.', 5, '18 days 14:58'),
            ('iPhone SE (2nd gen)', 'Marcela Uribe', 'Rápido y compacto, pero la batería se queda corta y el diseño ya tiene años encima.', 3, '66 days 19:47'),
            ('iPhone 12 mini', 'Lorena Pineda', 'Por fin un teléfono pequeño con todo lo de la gama alta. Cabe en cualquier bolsillo y no renuncia a nada.', 5, '10 days 10:52'),
            ('iPhone 12 mini', 'Camilo Restrepo', 'Me enamoró el tamaño, pero la batería no llega a la noche si uso 5G. Tuve que cargarlo dos veces al día.', 3, '74 days 21:38'),
            ('iPhone 12', 'Ximena Duque', 'Los bordes planos le devolvieron la personalidad y MagSafe es mucho más útil de lo que esperaba.', 5, '15 days 16:11'),
            ('iPhone 12 Pro', 'Emilio Vargas', 'El azul pacífico es el mejor color que han hecho. El LiDAR ayuda mucho al enfoque en la noche.', 5, '12 days 09:24'),
            ('iPhone 12 Pro', 'Beatriz Cano', 'Cámara sobresaliente, aunque la diferencia real con el modelo estándar no justifica los doscientos dólares extra.', 4, '57 days 20:16'),
            ('iPhone 12 Pro Max', 'Raúl Jiménez', 'El sensor grande de este modelo saca fotos que ningún otro iPhone iguala. Es enorme, y lo asumí sabiendo.', 5, '19 days 13:03'),
            ('iPhone 13 mini', 'Silvia Moreno', 'La batería mejoró bastante frente al 12 mini y ahora sí llega a la noche. Sigue siendo el mejor tamaño.', 5, '14 days 11:41'),
            ('iPhone 13 mini', 'Álvaro Guzmán', 'Compacto y potente, pero sé que es el último pequeño que van a hacer y eso me da algo de tristeza.', 4, '88 days 18:55'),
            ('iPhone 13', 'Renata Ávila', 'La muesca más pequeña y la batería más grande hacen la diferencia diaria. El rosa es muy elegante en persona.', 5, '11 days 15:29'),
            ('iPhone 13', 'Guillermo Prieto', 'Muy buen equipo, aunque viniendo del 12 el cambio se nota poco. Si tienes el anterior, espera.', 3, '63 days 09:07'),
            ('iPhone 13 Pro', 'Teresa Núñez', 'Los 120 Hz de ProMotion se sienten desde el primer deslizamiento y ya no puedo volver atrás.', 5, '8 days 12:48'),
            ('iPhone 13 Pro', 'Cristian Bedoya', 'El modo macro es divertido y la batería mejoró muchísimo. Se calienta grabando en ProRes, eso sí.', 4, '51 days 19:22'),
            ('iPhone 13 Pro Max', 'Gloria Sandoval', 'Autonomía de dos días reales y una cámara que reemplazó mi equipo de viaje. Pesado pero lo vale.', 5, '17 days 10:33'),
            ('iPhone SE (3rd gen)', 'Óliver Cadena', 'El A15 con 5G a este precio es la mejor puerta de entrada al ecosistema. Ideal para regalar.', 4, '13 days 14:19'),
            ('iPhone SE (3rd gen)', 'Rosa Delgado', 'Funciona muy bien, pero seguir vendiendo el diseño del 8 en 2022 con esos bordes ya es demasiado.', 2, '71 days 20:56'),
            ('iPhone 14', 'Leandro Padilla', 'Detección de choques y satélite de emergencia dan mucha tranquilidad para viajar por carretera.', 4, '16 days 11:15'),
            ('iPhone 14 Plus', 'Antonia Salgado', 'Pantalla grande sin pagar precio de Pro y la batería es la que más me ha durado. Excelente decisión.', 5, '12 days 17:37'),
            ('iPhone 14 Plus', 'Fabián Correa', 'La batería es su mejor virtud, pero por dentro es un 14 del año pasado. Me faltó ProMotion.', 3, '59 days 09:44'),
            ('iPhone 14 Pro', 'Alicia Franco', 'La Isla Dinámica dejó de ser un truco cuando las aplicaciones la aprovecharon. Los 48 MP se notan al recortar.', 5, '9 days 13:26'),
            ('iPhone 14 Pro', 'Martín Quintero', 'Pantalla siempre encendida preciosa, pero al principio me consumía batería. Se arregló con una actualización.', 4, '46 days 21:03'),
            ('iPhone 14 Pro Max', 'Diana Espinosa', 'Es la cámara que uso para trabajar y no me ha quedado mal ni una vez. La batería aguanta jornadas completas.', 5, '20 days 10:11'),
            ('iPhone 15', 'Pablo Uribe', 'Por fin USB-C y un solo cable para todo. El vidrio mate en color no deja huellas y se siente muy bien.', 5, '10 days 15:52'),
            ('iPhone 15', 'Norma Trujillo', 'Buen equipo y la Isla Dinámica llegó al modelo básico, pero la carga por USB-C es más lenta de lo que esperaba.', 4, '54 days 19:28'),
            ('iPhone 15 Plus', 'Eduardo Barrios', 'Pantalla grande, batería enorme y USB-C. Es el modelo con mejor equilibrio de toda la generación.', 5, '15 days 12:07'),
            ('iPhone 15 Pro', 'Rocío Maldonado', 'El titanio bajó el peso lo suficiente para notarlo. El botón de acción lo tengo puesto en la linterna y lo uso a diario.', 5, '7 days 11:34'),
            ('iPhone 15 Pro', 'Ismael Fuentes', 'Muy rápido y ligero, aunque los primeros días se calentaba bastante jugando. Ya está corregido.', 4, '38 days 18:49'),
            ('iPhone 15 Pro Max', 'Bárbara Lozada', 'El teleobjetivo de 5x es de otro nivel para conciertos y viajes. La mejor cámara que he tenido.', 5, '11 days 09:58'),
            ('iPhone 15 Pro Max', 'Joaquín Rivas', 'Excelente en todo, pero mil doscientos dólares es mucho dinero para una actualización anual.', 4, '67 days 20:22'),
            ('iPhone 16', 'Irene Cabrera', 'El control de cámara es cómodo una vez le agarras el punto. El color ultramarino se ve mejor en persona.', 4, '14 days 13:45'),
            ('iPhone 16', 'Álex Montenegro', 'Mucho rendimiento para lo que cuesta, aunque compré pensando en funciones de inteligencia que llegaron meses después.', 3, '77 days 10:29'),
            ('iPhone 16 Plus', 'Susana Peláez', 'Pantalla amplia y batería que no se acaba. Para quien no quiere gastar en un Pro, es la opción.', 5, '18 days 16:53'),
            ('iPhone 16 Pro', 'Ernesto Palacios', 'La pantalla de 6.3 con marcos mínimos es preciosa y grabar a 4K 120 fps es una locura.', 5, '8 days 12:31'),
            ('iPhone 16 Pro', 'Ángela Sepúlveda', 'Todo excelente, pero el titanio del desierto marca las huellas más de lo que me gustaría.', 4, '43 days 19:14'),
            ('iPhone 16 Pro Max', 'Vicente Alarcón', 'Batería récord y cámara ultra gran angular de 48 MP que por fin está a la altura. Sin quejas.', 5, '12 days 11:06'),
            ('iPhone 16 Pro Max', 'Lina Guerrero', 'Impecable, aunque el tamaño obliga a usar dos manos siempre. Lo sabía al comprarlo.', 4, '62 days 20:37'),
            ('iPhone 16e', 'Hugo Miranda', 'Rendimiento de gama alta con un módem propio que gasta menos batería. Muy buena entrada de gama.', 4, '16 days 14:22'),
            ('iPhone 16e', 'Claudia Rincón', 'Me gusta el precio, pero perder la cámara ultra gran angular y MagSafe se siente en el día a día.', 3, '58 days 09:41'),
            ('iPhone 17', 'Federico Villamil', 'Ahora el modelo base trae 120 Hz y arranca en 256 GB. Es la mejor generación estándar en años.', 5, '10 days 17:18'),
            ('iPhone 17', 'Marisol Otero', 'La pantalla antirreflejo se agradece al sol y el color lavanda es muy bonito. Nada que reprochar.', 5, '39 days 12:55'),
            ('iPhone Air', 'Tobías Encinas', 'Cinco milímetros y medio de grosor que hay que tener en la mano para creerlo. Es un objeto precioso.', 5, '9 days 10:47'),
            ('iPhone Air', 'Elsa Miramontes', 'Es una obra de ingeniería, pero con una sola cámara y batería justa pagas el diseño por encima de todo.', 3, '48 days 21:29'),
            ('iPhone 17 Pro', 'Aurelio Barrera', 'El cuerpo de aluminio con cámara de vapor mantiene la temperatura estable grabando media hora seguida.', 5, '7 days 13:12'),
            ('iPhone 17 Pro', 'Noelia Cifuentes', 'El naranja cósmico llama la atención y las tres cámaras de 48 MP son consistentes entre sí. Muy contenta.', 5, '35 days 18:36'),
            ('iPhone 17 Pro Max', 'Ramiro Escalante', 'La batería más grande que han puesto en un iPhone y se nota: dos días completos sin pensar en el cargador.', 5, '13 days 11:53'),
            ('iPhone 17e', 'Yolanda Cepeda', 'Trae el A19 y MagSafe, que era lo que le faltaba al 16e. Ahora sí es la opción económica que tiene sentido.', 4, '21 days 15:44')
        ) AS v (modelo, nombre, mensaje, calificacion, desfase) ON v.modelo = c.modelo;
    ELSE
        RAISE NOTICE '[seed] comentarios ya existía: no se insertan valoraciones.';
    END IF;

    IF faltaba_usuarios THEN
        -- 5. Usuario del backoffice para desarrollo, ya activo.
        --
        --   documento:  1234567890
        --   contraseña: Admin1234
        --
        -- Hash scrypt con los mismos parámetros que `hashPassword()`
        -- (src/lib/auth/password.ts). La sal es aleatoria: regenerarlo da otra
        -- cadena igual de válida. Fuera de local, cambiar la contraseña o
        -- borrar este usuario.
        INSERT INTO usuarios (documento, nombre, password_hash, is_active)
        VALUES ('1234567890', 'Administrador',
                'scrypt:16384:8:1:Py-pkFomaTdn5kyA9I3IDg:YwuV1Z4TuUIARzcBJ2UowAkIVmvd_N8ol_HapdzcYolsDTDBHSyEhCHKKnUe0pzqUXvMd3RO-rGtw8sN6D8CDA',
                TRUE);
    ELSE
        RAISE NOTICE '[seed] usuarios ya existía: no se crea el usuario de desarrollo.';
    END IF;
END $$;
