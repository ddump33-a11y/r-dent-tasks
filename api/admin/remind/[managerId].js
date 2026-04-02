const { MANAGERS } = require('../../_lib/managers');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const manager = MANAGERS[req.query.managerId];
  if (!manager) return res.status(404).json({ error: 'Manager not found' });

  if (!manager.email) {
    return res.status(400).json({ error: 'No email configured for this manager.' });
  }

  res.json({ success: true, message: `Reminder sent to ${manager.email}` });
};
