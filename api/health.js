// api/health.js - Vercel serverless function
module.exports = function handler(req, res) {
  res.status(200).json({ status: 'ok', message: 'Server is running', time: new Date() });
};