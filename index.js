const express = require("express");
const cors = require("cors");
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");

const app = express();

const tenantID = "c2543cdf-68b1-41f5-b543-8dc97906bedf";
const audience = "api://4bacccf4-e9b6-4fcd-b89c-7d08472551b1";

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://black-glacier-08e681d03.azurestaticapps.net",
    "https://black-glacier-08e681d03.7.azurestaticapps.net"
  ]
}));

app.use(express.json());

/* ✅ DEBUG: LOG RAW TOKEN */
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("🔍 AUTH HEADER:", authHeader);

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      console.log("✅ TOKEN PAYLOAD:", payload);
    } catch (err) {
      console.log("❌ Failed to decode token");
    }
  }

  next();
});

/* ✅ JWT VALIDATION */
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://login.microsoftonline.com/${tenantID}/discovery/keys`
  }),
  audience,
  issuer: [
    `https://sts.windows.net/${tenantID}/`,
    `https://sts.windows.net/${tenantID}`
  ],
  algorithms: ["RS256"]
});

/* ✅ ERROR HANDLER */
app.use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    console.log("❌ JWT ERROR:", err.message);
    return res.status(403).json({ error: "Invalid token" });
  }
  next(err);
});

/* ✅ PROTECTED ROUTE */
app.post("/assign", checkJwt, (req, res) => {
  console.log("✅ AUTH SUCCESS - REQUEST BODY:", req.body);

  const { workers, task } = req.body;

  if (!workers || !task) {
    return res.status(400).json({ error: "Missing workers or task" });
  }

  let bestWorker = null;
  let bestScore = Infinity;

  workers.forEach((w) => {
    const score = Number(w.distance) + (Number(w.workload) * 2) - Number(task.priority);

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
