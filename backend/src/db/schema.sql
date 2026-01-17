BEGIN;

DROP TABLE IF EXISTS inventory_movement CASCADE;
DROP TABLE IF EXISTS inventory_start_balance CASCADE;
DROP TABLE IF EXISTS workers CASCADE;

CREATE TABLE workers (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('scanner','desktop','admin')),
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory_start_balance (
  id             BOOLEAN PRIMARY KEY DEFAULT TRUE,
  starting_qty   BIGINT NOT NULL CHECK (starting_qty >= 0),
  effective_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by     BIGINT REFERENCES workers(id)
);

CREATE TABLE inventory_movement (
  id            BIGSERIAL PRIMARY KEY,
  action        TEXT NOT NULL CHECK (action IN ('incoming','outgoing')),
  movement_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  worker_id     BIGINT NOT NULL REFERENCES workers(id),
  quantity      INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  destination   INTEGER CHECK (destination BETWEEN 1 AND 5),
  CONSTRAINT destination_required_for_outgoing
    CHECK (action <> 'outgoing' OR destination IS NOT NULL)
);

CREATE INDEX idx_inventory_movement_time
  ON inventory_movement (movement_time DESC);

CREATE INDEX idx_inventory_movement_action_time
  ON inventory_movement (action, movement_time DESC);

CREATE INDEX idx_inventory_movement_worker_time
  ON inventory_movement (worker_id, movement_time DESC);

-- Seed starting inventory
INSERT INTO inventory_start_balance (id, starting_qty)
VALUES (TRUE, 100);

COMMIT;
