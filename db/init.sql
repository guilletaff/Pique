-- Necesario para impedir reservas solapadas en la misma pista
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE usuarios (
  id            SERIAL PRIMARY KEY,
  nombre        VARCHAR(80)  NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol           VARCHAR(10)  NOT NULL DEFAULT 'jugador'
                CHECK (rol IN ('jugador', 'admin')),
  creado_en     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE pistas (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(60) NOT NULL UNIQUE,
  descripcion TEXT,
  activa      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE reservas (
  id         SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  pista_id   INTEGER NOT NULL REFERENCES pistas(id)   ON DELETE CASCADE,
  inicio     TIMESTAMPTZ NOT NULL,
  fin        TIMESTAMPTZ NOT NULL,
  CHECK (fin > inicio),
  -- Dos reservas de la misma pista no pueden solaparse en el tiempo
  EXCLUDE USING gist (pista_id WITH =, tstzrange(inicio, fin) WITH &&)
);

CREATE TABLE partidos (
  id             SERIAL PRIMARY KEY,
  fecha          DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_por     INTEGER NOT NULL REFERENCES usuarios(id),
  sets_equipo1   SMALLINT NOT NULL CHECK (sets_equipo1 >= 0),
  sets_equipo2   SMALLINT NOT NULL CHECK (sets_equipo2 >= 0),
  CHECK (sets_equipo1 <> sets_equipo2)
);

-- Los 4 jugadores de cada partido (2 por equipo)
CREATE TABLE partido_jugadores (
  partido_id INTEGER  NOT NULL REFERENCES partidos(id)  ON DELETE CASCADE,
  usuario_id INTEGER  NOT NULL REFERENCES usuarios(id)  ON DELETE CASCADE,
  equipo     SMALLINT NOT NULL CHECK (equipo IN (1, 2)),
  PRIMARY KEY (partido_id, usuario_id)
);