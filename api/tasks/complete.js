const { MANAGERS } = require('../_lib/managers');
const { loadLog, saveLog, todayStr } = require('../_lib/storage');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { managerId, taskId, notes, completed } = req.body;

  if (!MANAGERS[managerId]) return res.status(404).json({ error: 'Manager not found' });

  const today = todayStr();
  const log = await loadLog(today);
  if (!log[managerId]) log[managerId] = {};

  if (completed === false) {
    delete log[managerId][taskId];
  } else {
    log[managerId][taskId] = {
      completed: true,
      time: new Date().toISOString(),
      notes: notes || ''
    };
  }

  await saveLog(today, log);
  res.json({ success: true, task: log[managerId][taskId] || { completed: false } });
};
