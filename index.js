const express = require('express');
const cors = require('cors');

const app = express();

// ✅ Middleware
app.use(cors({
  origin: "http://localhost:3000"
}));
app.use(express.json());

// ✅ Test route
app.get('/', (req, res) => {
  res.send('✅ EthixFlow Backend Running');
});

// ✅ Task assignment endpoint (AI ENGINE)
app.post('/assign', (req, res) => {
  const { workers, task } = req.body;

  // ✅ Validation
  if (!workers || workers.length === 0) {
    return res.status(400).json({ error: "No workers provided" });
  }

  if (!task || typeof task.priority !== "number") {
    return res.status(400).json({ error: "Invalid task priority" });
  }

  // ✅ Use worker data directly (no random values)
  const workerData = workers;

  let bestWorker = null;
  let bestScore = Infinity;

  // ✅ AI decision logic
  workerData.forEach((worker) => {

    // ✅ Validate each worker
    if (
      !worker.name ||
      typeof worker.distance !== "number" ||
      typeof worker.workload !== "number"
    ) {
      return;
    }

    // ✅ Score calculation
    const score = worker.distance + (worker.workload * 2) - task.priority;

    // ✅ Attach score for UI display
    worker.score = score;

    if (score < bestScore) {
      bestScore = score;
      bestWorker = worker;
    }
  });

  // ✅ Fallback safety check
  if (!bestWorker) {
    return res.status(400).json({ error: "No valid workers found" });
  }

  // ✅ Response with explainable output
  res.json({
    assignedTo: bestWorker.name,
    explanation: `Assigned to ${bestWorker.name} because of lower distance (${bestWorker.distance}) and lower workload (${bestWorker.workload}), resulting in the best score.n the best score.`,
    details: workerData
  });
});

// ✅ Start server
const PORT = 5000;

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
