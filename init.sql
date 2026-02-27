CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_movement (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('incoming', 'outgoing')),
    worker_id INT REFERENCES workers(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    destination INT,
    movement_time TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_start_balance (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    starting_qty INT NOT NULL,
    effective_time TIMESTAMP DEFAULT NOW()
);

INSERT INTO inventory_start_balance (id, starting_qty, effective_time)
VALUES (TRUE, 0, NOW())
ON CONFLICT (id) DO NOTHING;
