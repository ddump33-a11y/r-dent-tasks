const { MANAGERS } = require('../_lib/managers');
const { kv } = require('@vercel/kv');

function todayStr() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return now.toISOString().split('T')[0];
}

module.exports = async function handler(req, res) {
  const date = req.query.date || todayStr();
  const results = {};

  for (const managerId of Object.keys(MANAGERS)) {
    const key = `notes:${date}:${managerId}`;
    const notes = await kv.get(key);
    results[managerId] = notes || '';
  }

  res.json(results);
};
