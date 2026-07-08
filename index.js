

require("dotenv").config();
import express, { json } from "express";
import cors from "cors";
import { sign, verify } from "jsonwebtoken";
import { connect, Schema, model } from "mongoose";

const app = express();

const SECRET = "ethixflow_secret";

/* ✅ CONNECT TO MONGODB */
connect(
  process.env.MONGODB_URI
)
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.error("❌ MongoDB connection error:", err));

/* ✅ SCHEMA */
const taskSchema = new Schema({
  workers: [
    {
      name: String,
      distance: Number,
      workload: Number
    }
  ],
  priority: Number,
  assignedTo: String,
  score: Number,
  explanation: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Task = model("Task", taskSchema);

/* ✅ MIDDLEWARE */
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.FRONTEND_URL
  ]
}));

app.use(json());

/* ✅ LOGIN (JWT AUTH) */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Demo credentials (for VIVA)
  if (email === "admin@test.com" && password === "1234") {
    const token = sign(
      { email },
      SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      token,
      message: "Login successful"
    });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

/* ✅ JWT MIDDLEWARE */
const checkJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
};

/* ✅ HEALTH CHECK */
app.get("/", (req, res) => {
  res.send("✅ Backend is running successfully!");
});

/* ✅ TASK ASSIGNMENT */
app.post("/assign", checkJwt, async (req, res) => {
  const { workers, task } = req.body;

  if (!workers || !task) {
    return res.status(400).json({ message: "Missing workers or task" });
  }

  let bestWorker = null;
  let bestScore = Infinity;
  let bestBreakdown = "";

  for (const w of workers) {

    /* ✅ FAIRNESS PENALTY */
    const previousAssignments = await Task.countDocuments({
      assignedTo: w.name
    });

    const fairnessPenalty = previousAssignments * 2;

    const distanceScore = Number(w.distance);
    const workloadScore = Number(w.workload) * 2;
    const priorityImpact = Number(task.priority);

    const score =
      distanceScore +
      workloadScore +
      fairnessPenalty -
      priorityImpact;

    /* ✅ EXPLAINABILITY */
    const breakdown = `
Worker: ${w.name}
- Distance: ${distanceScore}
- Workload penalty: ${workloadScore}
- Fairness penalty: ${fairnessPenalty} (${previousAssignments} past assignments)
- Priority adjustment: -${priorityImpact}
Final Score: ${score}
`;

    if (score < bestScore) {
      bestScore = score;
      bestWorker = w;
      bestBreakdown = breakdown;
    }
  }

  const explanation = `
✅ Assigned to ${bestWorker.name}

${bestBreakdown}
`;

  try {
    const newTask = new Task({
      workers,
      priority: task.priority,
      assignedTo: bestWorker.name,
      score: bestScore,
      explanation
    });

    await newTask.save();

    res.json({
      assignedTo: bestWorker.name,
      score: bestScore,
      explanation
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to save task" });
  }
});

/* ✅ GET TASK HISTORY (OPTIONAL: PROTECT IT) */
app.get("/tasks", checkJwt, async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

/* ✅ START SERVER */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});