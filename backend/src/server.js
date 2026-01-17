import express from "express";;
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db.js";

const app = express();

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type != "Bearer" || !token) return res.sendStatus(401);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.sendStatus(401);
  }
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.sendStatus(403);
    if (!allowedRoles.includes(req.user.role)) return res.sendStatus(403);

    return next();
  };
}

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  try {
    const result = await pool.query(
      "SELECT id, password_hash, full_name, role FROM workers WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) return res.sendStatus(401);

    const worker = result.rows[0];
    const valid = await bcrypt.compare(password, worker.password_hash);
    if (!valid) return res.sendStatus(401);

    const userPayload = {
      workerId: worker.id,
      username,
      name: worker.full_name,
      role: worker.role, //scanner, desktop, admin
    };

    const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: "8h" });

    return res.json({
      message: "Login successful",
      token,
      user: { id: worker.id, username, name: worker.full_name, role: worker.role },
    });
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
});

app.get("/api/me", requireAuth, (req, res) => {
  return res.json({
    id: req.user.workerId,
    username: req.user.username,
    name: req.user.name,
    role: req.user.role,
  });
});

app.post("/api/logout", (req, res) => {
  return res.json({ message: "Logged out" });
});

async function insertMovement({ action, workerId, quantity, destination }) {
  if (action === "incoming") {
    const result = await pool.query(
      `
      INSERT INTO inventory_movement (action, worker_id, quantity)
      VALUES ($1, $2, $3)
      RETURNING id, action, movement_time, worker_id, quantity, destination
      `,
      [action, workerId, quantity]
    );
    return result.rows[0];
  }

  const result = await pool.query(
    `
    INSERT INTO inventory_movement (action, worker_id, quantity, destination)
    VALUES ($1, $2, $3, $4)
    RETURNING id, action, movement_time, worker_id, quantity, destination
    `,
    [action, workerId, quantity, destination]
  );
  return result.rows[0];
}

function validateQuantity(quantity) {
  const q = Number(quantity);
  if (!Number.isInteger(q) || q < 1 || q > 10) return null;
  return q;
}

app.post("/api/incoming", requireAuth, async (req, res) => {
  const quantity = validateQuantity(req.body.quantity);

  if (quantity == null) return res.status(400).json({ error: "invalid quantity" });

  try {
    const row = await insertMovement({
      action: "incoming",
      workerId: req.user.workerId,
      quantity,
      destination: null,
    });

    return res.status(201).json({ message: "saved", movement: row });
  } catch {
    return res.status(500).json({ error: "database error" });
  }
});

function validateDestination(dest) {
  const d = Number(dest);
  if (!Number.isInteger(d) || d < 1 || d > 5) return null;
  return d;
}

app.post("/api/outgoing", requireAuth, async (req, res) => {
  const quantity = validateQuantity(req.body.quantity);
  if (quantity == null) return res.status(400).json({ error: "invalid quantity" });

  const destination = validateDestination(req.body.destination);
  if (destination == null) {
    return res.status(400).json({ error: "destination must be an integer 1-5" });
  }

  try {
    const row = await insertMovement({
      action: "outgoing",
      workerId: req.user.workerId,
      quantity,
      destination, // integer
    });

    return res.status(201).json({ message: "saved", movement: row });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "database error" });
  }
});

app.get("/api/dashboard/daily", requireAuth, requireRole(["admin", "desktop"]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    const result = await pool.query(
      `
      SELECT 
        DATE(movement_time) as date,
        action,
        SUM(quantity)::bigint AS total
      FROM inventory_movement
      WHERE DATE(movement_time) >= $1 AND DATE(movement_time) <= $2
      GROUP BY DATE(movement_time), action
      ORDER BY DATE(movement_time) DESC, action
      `,
      [startDate, endDate]
    );

    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "database error" });
  }
});

app.get("/api/dashboard/destinations", requireAuth, requireRole(["admin", "desktop"]), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    const result = await pool.query(
      `
      SELECT 
        destination,
        SUM(quantity)::bigint AS total,
        COUNT(*) as num_movements
      FROM inventory_movement
      WHERE action = 'outgoing' 
        AND DATE(movement_time) >= $1 
        AND DATE(movement_time) <= $2
      GROUP BY destination
      ORDER BY total DESC
      `,
      [startDate, endDate]
    );

    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "database error" });
  }
});

app.get("/api/dashboard/day-details", requireAuth, requireRole(["admin", "desktop"]), async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "date required (YYYY-MM-DD)" });
    }

    const result = await pool.query(
      `
      SELECT 
        id,
        action,
        quantity,
        destination,
        movement_time,
        worker_id
      FROM inventory_movement
      WHERE DATE(movement_time) = $1
      ORDER BY movement_time DESC
      `,
      [date]
    );

    return res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "database error" });
  }
});

app.get("/api/dashboard/on-hand", requireAuth, requireRole(["admin", "desktop"]), async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        sb.starting_qty
        + COALESCE(SUM(CASE WHEN im.action = 'incoming' THEN im.quantity ELSE 0 END), 0)
        - COALESCE(SUM(CASE WHEN im.action = 'outgoing' THEN im.quantity ELSE 0 END), 0)
        AS on_hand
      FROM inventory_start_balance sb
      LEFT JOIN inventory_movement im
        ON im.movement_time >= sb.effective_time
      WHERE sb.id = TRUE
      GROUP BY sb.starting_qty;
      `
    );

    return res.json({ onHand: Number(result.rows[0]?.on_hand ?? 0) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "database error" });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Backend running on http://0.0.0.0:3000");
});