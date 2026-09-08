const connectDB = require('../config/db');

const dbMiddleware = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("✗ Database connection failed:", err.message);
    res.status(500).json({
      error: "Database connection failed",
      details: err.message
    });
  }
};

module.exports = dbMiddleware;
