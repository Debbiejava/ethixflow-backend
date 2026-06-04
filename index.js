const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = express();

const SECRET = "ethixflow_secret";

/* ✅ CONNECT TO MONGODB */
mongoose.connect(
  "mongodb+srv://oluwaseuna294_db_user:Inverclyde%402025@ethixflowdb.n8y7ujr.mongodb.net/ethixflow?retryWrites=true&w=majority"
)
.then(() => console.log("✅ MongoDB connected successfully"))
.catch(err => console.error("❌ MongoDB connection error:", err));

/* ✅ SCHEMA */
const taskSchema = new mongoose.Schema({
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

const Task = mongoose.model("Task", taskSchema);

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

/* ✅ LOGIN */
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@test.com" && password === "1234") {
    const token = jwt.sign({ email }, SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

/* ✅ JWT CHECK */
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

/* ✅ ASSIGN + FAIRNESS + EXPLAINABILITY */
app.post("/assign", checkJwt, async (req, res) => {
  const { workers, task } = req.body;

  if (!workers || !task) {
    return res.status(400).json({ error: "Missing workers or task" });
  }

  let bestWorker = null;
  let bestScore = Infinity;
  let bestBreakdown = "";

  for (const w of workers) {

    /* ✅ FAIRNESS PENALTY (history-based) */
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

    /* ✅ EXPLAINABILITY BREAKDOWN */
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
      explanation
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save task" });
  }
});

/* ✅ GET HISTORY */
app.get("/tasks", async (req, res) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("✅ Backend running"));