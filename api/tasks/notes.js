const { MANAGERS } = require('../_lib/managers');
const { kv } = require('@vercel/kv');

function todayStr() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return now.toISOString().split('T')[0];
}

module.exports = async function handler(req, res) {
  const { managerId } = req.query;

  if (!MANAGERS[managerId]) {
    return res.status(404).json({ error: 'Manager not found' });
  }

  const date = req.query.date || todayStr();
  const key = `notes:${date}:${managerId}`;

  if (req.method === 'GET') {
    const notes = await kv.get(key);
    return res.json({ notes: notes || '' });
  }

  if (req.method === 'POST') {
    const { notes } = req.body;
    await kv.set(key, notes || '');
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
