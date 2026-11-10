-- ==============================================================================
-- iwantmyphone · app nativa — esquema de `iwantmyphone_app`
-- ==============================================================================
--
-- Traducción literal de db/db-diagram.dbml. Idempotente: tipos y tablas se
-- crean solo si faltan, así que `npm run db:setup` se puede lanzar siempre.
-- Cambiar una tabla existente NO se hace aquí: `npm run db:reset` la recrea.
--
-- Los nombres de las restricciones son contrato: la API traduce sus
-- violaciones a 400/409 por nombre (conRestricciones en src/http.ts).
--
-- gen_random_uuid() es nativo desde Postgres 13: no hace falta pgcrypto.
-- ==============================================================================

DO $$
BEGIN
    IF to_regtype('rol_usuario') IS NULL THEN
        CREATE TYPE rol_usuario AS ENUM ('visitante', 'vendedor', 'administrador');
    END IF;
    IF to_regtype('estado_pedido') IS NULL THEN
        CREATE TYPE estado_pedido AS ENUM ('pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado');
    END IF;
    IF to_regtype('estado_pago') IS NULL THEN
        CREATE TYPE estado_pago AS ENUM ('pendiente', 'aprobado', 'rechazado', 'fallido', 'reversado');
    END IF;
END $$;

-- ------------------------------------------------------------------ Catálogo

CREATE TABLE IF NOT EXISTS marcas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre      VARCHAR(100) NOT NULL,
    logo_url    VARCHAR(2048),
    pais_origen VARCHAR(100) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT marcas_nombre_key UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS celulares (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca_id          UUID NOT NULL,
    modelo            VARCHAR(150) NOT NULL,
    descripcion       TEXT,
    images_urls       TEXT,
    precio            DECIMAL(10, 2) NOT NULL,
    costo             DECIMAL(10, 2) NOT NULL DEFAULT 0,
    descuento_pct     SMALLINT NOT NULL DEFAULT 0,
    fecha_lanzamiento DATE NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_celulares_precio    CHECK (precio >= 0),
    CONSTRAINT chk_celulares_costo     CHECK (costo >= 0),
    CONSTRAINT chk_celulares_descuento CHECK (descuento_pct BETWEEN 0 AND 90),
    CONSTRAINT fk_celulares_marcas FOREIGN KEY (marca_id) REFERENCES marcas (id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_celulares_fecha ON celulares (fecha_lanzamiento DESC);
CREATE INDEX IF NOT EXISTS idx_celulares_marca ON celulares (marca_id);

CREATE TABLE IF NOT EXISTS especificaciones (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    celular_id     UUID NOT NULL,
    procesador     VARCHAR(100) NOT NULL,
    ram            VARCHAR(50) NOT NULL,
    almacenamiento VARCHAR(50) NOT NULL,
    pantalla       VARCHAR(100) NOT NULL,
    camara         VARCHAR(150) NOT NULL,
    bateria        VARCHAR(50) NOT NULL,
    sistema_op     VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT especificaciones_celular_id_key UNIQUE (celular_id),
    CONSTRAINT fk_especificaciones_celulares FOREIGN KEY (celular_id) REFERENCES celulares (id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comentarios (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    celular_id   UUID NOT NULL,
    nombre       VARCHAR(100) NOT NULL,
    mensaje      TEXT NOT NULL,
    calificacion SMALLINT NOT NULL,
    fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_comentarios_calificacion CHECK (calificacion BETWEEN 1 AND 5),
    CONSTRAINT fk_comentarios_celulares FOREIGN KEY (celular_id) REFERENCES celulares (id)
        ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_comentarios_celular ON comentarios (celular_id);

-- ------------------------------------------------------------------ Usuarios

CREATE TABLE IF NOT EXISTS usuarios (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(254) NOT NULL,
    nombre        VARCHAR(100) NOT NULL,
    documento     VARCHAR(20),
    telefono      VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    rol           rol_usuario NOT NULL DEFAULT 'visitante',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT usuarios_email_key UNIQUE (email),
    CONSTRAINT chk_usuarios_email_minusculas CHECK (email = lower(email)),
    CONSTRAINT chk_usuarios_documento CHECK (documento IS NULL OR documento ~ '^[0-9]{6,20}$')
);

CREATE TABLE IF NOT EXISTS credenciales_biometricas (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   UUID NOT NULL,
    dispositivo  VARCHAR(100) NOT NULL,
    public_key   TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    CONSTRAINT fk_credenciales_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_credenciales_usuario ON credenciales_biometricas (usuario_id);

CREATE TABLE IF NOT EXISTS recuperaciones_password (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID NOT NULL,
    codigo_hash VARCHAR(255) NOT NULL,
    intentos    SMALLINT NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    usado_at    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_recuperaciones_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
        ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_recuperaciones_usuario ON recuperaciones_password (usuario_id, created_at DESC);

-- ------------------------------------------------------------------ Perfil

CREATE TABLE IF NOT EXISTS favoritos (
    usuario_id UUID NOT NULL,
    celular_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT favoritos_pkey PRIMARY KEY (usuario_id, celular_id),
    CONSTRAINT fk_favoritos_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_favoritos_celulares FOREIGN KEY (celular_id) REFERENCES celulares (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS direcciones (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id   UUID NOT NULL,
    alias        VARCHAR(50) NOT NULL,
    direccion    VARCHAR(200) NOT NULL,
    ciudad       VARCHAR(100) NOT NULL,
    departamento VARCHAR(100) NOT NULL,
    indicaciones VARCHAR(300),
    telefono     VARCHAR(20) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_direcciones_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_direcciones_usuario ON direcciones (usuario_id);

-- ------------------------------------------------------------------ Ventas y pagos

CREATE TABLE IF NOT EXISTS metodos_pago (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo            VARCHAR(50) NOT NULL,
    nombre            VARCHAR(100) NOT NULL,
    descripcion       VARCHAR(300),
    proveedor         VARCHAR(50),
    requiere_pasarela BOOLEAN NOT NULL DEFAULT FALSE,
    config            JSONB NOT NULL DEFAULT '{}',
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    orden             SMALLINT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT metodos_pago_codigo_key UNIQUE (codigo)
);

CREATE TABLE IF NOT EXISTS pedidos (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero               INTEGER GENERATED ALWAYS AS IDENTITY (START WITH 1001),
    usuario_id           UUID,
    cliente_nombre       VARCHAR(100) NOT NULL,
    cliente_email        VARCHAR(254) NOT NULL,
    cliente_documento    VARCHAR(20),
    cliente_telefono     VARCHAR(20) NOT NULL,
    direccion_entrega    VARCHAR(200) NOT NULL,
    ciudad_entrega       VARCHAR(100) NOT NULL,
    departamento_entrega VARCHAR(100) NOT NULL,
    indicaciones_entrega VARCHAR(300),
    metodo_pago_id       UUID NOT NULL,
    estado               estado_pedido NOT NULL DEFAULT 'pendiente',
    pagado_at            TIMESTAMPTZ,
    subtotal             DECIMAL(12, 2) NOT NULL,
    descuento            DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total                DECIMAL(12, 2) NOT NULL,
    costo_total          DECIMAL(12, 2) NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pedidos_numero_key UNIQUE (numero),
    CONSTRAINT chk_pedidos_total CHECK (total = subtotal - descuento AND total >= 0),
    CONSTRAINT fk_pedidos_usuarios FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL,
    CONSTRAINT fk_pedidos_metodos_pago FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago (id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha ON pedidos (created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_usuario ON pedidos (usuario_id);

CREATE TABLE IF NOT EXISTS pedido_items (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id          UUID NOT NULL,
    celular_id         UUID,
    modelo             VARCHAR(150) NOT NULL,
    imagen_url         VARCHAR(2048),
    cantidad           INTEGER NOT NULL,
    precio_unitario    DECIMAL(10, 2) NOT NULL,
    descuento_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0,
    costo_unitario     DECIMAL(10, 2) NOT NULL,
    CONSTRAINT chk_items_cantidad CHECK (cantidad > 0),
    CONSTRAINT fk_items_pedidos FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
    CONSTRAINT fk_items_celulares FOREIGN KEY (celular_id) REFERENCES celulares (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_items_pedido ON pedido_items (pedido_id);
CREATE INDEX IF NOT EXISTS idx_items_celular ON pedido_items (celular_id);

CREATE TABLE IF NOT EXISTS pagos (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id           UUID NOT NULL,
    metodo_pago_id      UUID NOT NULL,
    referencia          VARCHAR(100) NOT NULL,
    referencia_pasarela VARCHAR(100),
    estado              estado_pago NOT NULL DEFAULT 'pendiente',
    monto               DECIMAL(12, 2) NOT NULL,
    moneda              CHAR(3) NOT NULL DEFAULT 'COP',
    medio               VARCHAR(50),
    respuesta           JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT pagos_referencia_key UNIQUE (referencia),
    CONSTRAINT fk_pagos_pedidos FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
    CONSTRAINT fk_pagos_metodos_pago FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago (id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido ON pagos (pedido_id);
-- "Como mucho un pago aprobado por pedido", garantizado por la BD.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pagos_aprobado_por_pedido ON pagos (pedido_id) WHERE estado = 'aprobado';
