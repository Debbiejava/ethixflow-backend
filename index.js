const express = require("express");
const cors = require("cors");

const app = express();

/* ✅ FIXED CORS (VERY IMPORTANT) */
app.use(cors()); // allow all origins (works for Azure frontend)

/* ✅ BODY PARSER */
app.use(express.json());

/* ✅ ROOT ROUTE (FOR TESTING) */
app.get("/", (req, res) => {
  res.send("✅ EthixFlow Backend Running");
});

/* ✅ ASSIGN ROUTE */
app.post("/assign", (req, res) => {
  try {
    console.log("Incoming request:", req.body);

    const { workers, task } = req.body;

    /* ✅ VALIDATION */
    if (!workers || !Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ error: "Workers data is missing or invalid" });
    }

    if (!task || task.priority === undefined) {
      return res.status(400).json({ error: "Priority is missing" });
    }

    /* ✅ COMPUTE SCORES */
    const results = workers.map(worker => {
      if (
        worker.distance === undefined ||
        worker.workload === undefined
      ) {
        throw new Error("Worker data incomplete");
      }

      return {
        ...worker,
        score: worker.distance + (worker.workload * 2) - task.priority
      };
    });

    /* ✅ FIND BEST WORKER */
    const best = results.reduce((a, b) =>
      a.score < b.score ? a : b
    );

    /* ✅ RETURN RESULT */
    res.json({
      assignedTo: best.name,
      explanation: `Best worker based on lowest score (${best.score})`,
      details: results
    });

  } catch (error) {
    console.error("❌ ERROR in /assign:", error.message);

    res.status(500).json({
      error: error.message || "Internal server error"
    });
  }
});

/* ✅ START SERVER (ONLY ONCE!) */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
