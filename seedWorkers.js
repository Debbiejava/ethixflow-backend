require("dotenv").config();

const mongoose = require("mongoose");
const Worker = require("./models/Worker");

mongoose.connect(process.env.MONGODB_URI)
.then(async () => {

    // Optional: Clear existing workers first
    await Worker.deleteMany({});

    const workers = [];

    for (let i = 1; i <= 100; i++) {

        workers.push({
            workerId: `W${String(i).padStart(3, "0")}`,
            name: `Worker ${i}`,
            workload: Math.floor(Math.random() * 11), // 0-10
            distance: Math.floor(Math.random() * 20) + 1, // 1-20
            historicalAssignments: Math.floor(Math.random() * 16), // 0-15
            available: Math.random() > 0.1 // 90% available
        });

    }

    await Worker.insertMany(workers);

    console.log("✅ 100 Workers Added Successfully");

    process.exit();

})
.catch((err) => {
    console.error("❌ Error:", err);
});