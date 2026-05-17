// api/health.js
module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.status(200).json({ status: 'ok', time: new Date() });
};