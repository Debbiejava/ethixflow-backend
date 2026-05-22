const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

/* ✅ CONFIG */
const SECRET_KEY = "your_secret_key";

/* ✅ TEMP USER STORAGE (for now) */
const users = [];

/* ✅ MIDDLEWARE */
app.use(cors()); // ✅ allow frontend
app.use(express.json());

/* ✅ TEST ROUTE */
app.get('/', (req, res) => {
  res.send('✅ EthixFlow Backend Running');
});


// =======================
// ✅ AUTH ROUTES
// =======================

// ✅ REGISTER
app.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Missing username or password" });
    }

    const existingUser = users.find(u => u.username === username);
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      username,
      password: hashedPassword,
      role: role || "user"
    };

    users.push(newUser);

    res.json({ message: "✅ User registered successfully" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


/* ✅ LOGIN */
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      {
        username: user.username,
        role: user.role
      },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    res.json({ token });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// =======================
// ✅ AUTH MIDDLEWARE
// =======================

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // ✅ attach user info
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};


// ✅ ROLE CHECK (optional but important)
const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};


// =======================
// ✅ PROTECTED TASK ASSIGNMENT
// =======================

app.post('/assign', authenticate, (req, res) => {
  try {
    const { workers, task } = req.body;

    if (!workers || workers.length === 0) {
      return res.status(400).json({ error: "No workers provided" });
    }

    if (!task || typeof task.priority !== "number") {
      return res.status(400).json({ error: "Invalid task priority" });
    }

    let bestWorker = null;
    let bestScore = Infinity;

    workers.forEach((worker) => {
      if (
        !worker.name ||
        typeof worker.distance !== "number" ||
        typeof worker.workload !== "number"
      ) {
        return;
      }

      const score = worker.distance + (worker.workload * 2) - task.priority;

      worker.score = score;

      if (score < bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    });

    if (!bestWorker) {
      return res.status(400).json({ error: "No valid workers found" });
    }

    res.json({
      assignedTo: bestWorker.name,
      explanation: `Assigned to ${bestWorker.name} based on optimal score (${bestScore}).`,
      details: workers,
      user: req.user // ✅ show who made request
    });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// =======================
// ✅ START SERVER
// =======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});