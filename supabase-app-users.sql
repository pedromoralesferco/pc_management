-- =============================================
-- FERCO Gestión de Equipos — Tabla app_users
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- =============================================

CREATE TABLE app_users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  nombre     TEXT NOT NULL,
  rol        TEXT NOT NULL DEFAULT 'viewer' CHECK (rol IN ('admin', 'viewer')),
  activo     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

-- Usuario admin inicial (cambia la contraseña luego desde la app)
INSERT INTO app_users (username, password, nombre, rol)
VALUES ('admin', 'ferco2024', 'Administrador', 'admin');
