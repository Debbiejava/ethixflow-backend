const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const app = express();

const SECRET = "ethixflow_secret";

/* ✅ MIDDLEWARE */
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://black-glacier-08e681d03.azurestaticapps.net",
    "https://black-glacier-08e681d03.7.azurestaticapps.net"
  ]
}));

app.use(express.json());

/* ✅ LOGIN ROUTE */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@test.com" && password === "1234") {
    const token = jwt.sign({ email }, SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

/* ✅ JWT VALIDATION (SIMPLE) */
const checkJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
};

/* ✅ HEALTH CHECK */
app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully!");
});

/* ✅ PROTECTED ROUTE */
app.post("/assign", checkJwt, (req, res) => {
  const { workers, task } = req.body;

  if (!workers || !task) {
    return res.status(400).json({ error: "Missing workers or task" });
  }

  let bestWorker = null;
  let bestScore = Infinity;

  workers.forEach((w) => {
    const score =
      Number(w.distance) +
      (Number(w.workload) * 2) -
      Number(task.priority);

    if (score < bestScore) {
      bestScore = score;
      bestWorker = w;
    }
  });

  res.json({
    assignedTo: bestWorker.name,
    explanation: `Assigned to ${bestWorker.name} with score ${bestScore}`
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("✅ Backend running"));