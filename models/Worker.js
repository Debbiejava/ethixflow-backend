const mongoose = require("mongoose");

const WorkerSchema = new mongoose.Schema({
    workerId: String,
    name: String,
    workload: Number,
    distance: Number,
    historicalAssignments: Number,
    available: Boolean
});

module.exports = mongoose.model("Worker", WorkerSchema);