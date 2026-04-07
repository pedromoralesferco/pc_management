-- =============================================
-- FERCO Gestión de Equipos — Schema Supabase
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

-- ========================
-- TABLA: equipos
-- ========================
CREATE TABLE equipos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlativo_ferco TEXT NOT NULL UNIQUE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('PC', 'Laptop', 'Monitor', 'Tablet', 'Otro')),
  marca             TEXT NOT NULL,
  modelo            TEXT NOT NULL,
  numero_serie      TEXT NOT NULL,
  descripcion       TEXT,
  estado            TEXT NOT NULL DEFAULT 'Activo'
                      CHECK (estado IN ('Activo', 'En mantenimiento', 'Dado de baja', 'En bodega')),
  fecha_compra      DATE,
  garantia_hasta    DATE,
  proveedor         TEXT,
  precio_compra     NUMERIC(10, 2),
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- TABLA: usuarios
-- ========================
CREATE TABLE usuarios (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  apellido      TEXT NOT NULL,
  centro_costo  TEXT NOT NULL,
  pais          TEXT NOT NULL,
  departamento  TEXT,
  cargo         TEXT,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- TABLA: asignaciones
-- ========================
CREATE TABLE asignaciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id         UUID NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
  usuario_id        UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  fecha_asignacion  DATE NOT NULL,
  fecha_devolucion  DATE,
  motivo            TEXT,
  asignado_por      TEXT,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- TABLA: mantenimientos
-- ========================
CREATE TABLE mantenimientos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id           UUID NOT NULL REFERENCES equipos(id) ON DELETE RESTRICT,
  tipo                TEXT NOT NULL CHECK (tipo IN ('Preventivo', 'Correctivo', 'Reparacion')),
  descripcion         TEXT NOT NULL,
  fecha_inicio        DATE NOT NULL,
  fecha_fin           DATE,
  proveedor_servicio  TEXT,
  costo               NUMERIC(10, 2),
  realizado_por       TEXT,
  estado              TEXT NOT NULL DEFAULT 'Pendiente'
                        CHECK (estado IN ('Pendiente', 'En progreso', 'Completado', 'Cancelado')),
  resultado           TEXT,
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================
-- AUTO updated_at trigger
-- ========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER equipos_updated_at
  BEFORE UPDATE ON equipos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ========================
-- ÍNDICES
-- ========================
CREATE INDEX idx_asignaciones_equipo   ON asignaciones(equipo_id);
CREATE INDEX idx_asignaciones_usuario  ON asignaciones(usuario_id);
CREATE INDEX idx_mantenimientos_equipo ON mantenimientos(equipo_id);

-- ========================
-- ROW LEVEL SECURITY (RLS)
-- Habilitar para producción — por ahora abierto con anon key
-- ========================
ALTER TABLE equipos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios       ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimientos ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (acceso total con anon key)
CREATE POLICY "allow_all_equipos"        ON equipos        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_usuarios"       ON usuarios       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_asignaciones"   ON asignaciones   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_mantenimientos" ON mantenimientos FOR ALL USING (true) WITH CHECK (true);

-- ========================
-- TABLA: responsivas
-- ========================
CREATE TABLE responsivas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre          TEXT NOT NULL,
  cargo           TEXT,
  departamento    TEXT,
  centro_costo    TEXT,
  pais            TEXT,
  tipo_asignacion TEXT NOT NULL DEFAULT 'Asignación'
                    CHECK (tipo_asignacion IN ('Asignación', 'Préstamo', 'Devolución')),
  entregado_por   TEXT,
  observaciones   TEXT,
  texto_legal     TEXT,
  fecha           DATE NOT NULL DEFAULT CURRENT_DATE,
  equipos         JSONB NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_responsivas_usuario ON responsivas(usuario_id);

ALTER TABLE responsivas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_responsivas" ON responsivas FOR ALL USING (true) WITH CHECK (true);

-- ========================
-- CAMPO: equipos.pais
-- Ejecutar si la tabla ya existe:
-- ALTER TABLE equipos ADD COLUMN IF NOT EXISTS pais TEXT;
-- ========================
-- (ya incluido en el CREATE TABLE de arriba si se corre desde cero)

-- ========================
-- TABLA: configuracion
-- ========================
CREATE TABLE configuracion (
  id             INTEGER PRIMARY KEY DEFAULT 1,
  nombre_empresa TEXT NOT NULL DEFAULT 'FERCO Total Look',
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO configuracion (id, nombre_empresa)
VALUES (1, 'FERCO Total Look')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_configuracion" ON configuracion FOR ALL USING (true) WITH CHECK (true);
