const { MANAGERS, ADMIN, START_DATE } = require('../_lib/managers');
const { loadLog, dayOfWeek } = require('../_lib/storage');

module.exports = async function handler(req, res) {
  const streaks = {};

  for (const [managerId, manager] of Object.entries(MANAGERS)) {
    let missedDays = 0;

    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      // Don't count days before tracking started
      if (dateStr < START_DATE) break;

      const dow = dayOfWeek(dateStr);
      if (dow === 'Sat' || dow === 'Sun') continue;

      const log = await loadLog(dateStr);
      const managerLog = log[managerId] || {};
      const applicableTasks = (manager.tasks.daily || []).filter(t => !t.days || t.days.includes(dow));
      const allDone = applicableTasks.every(t => managerLog[t.id] && managerLog[t.id].completed);

      if (!allDone && applicableTasks.length > 0) {
        missedDays++;
      } else {
        break;
      }
    }

    streaks[managerId] = {
      name: manager.name,
      consecutiveMissedDays: missedDays,
      escalation: missedDays >= (ADMIN.escalationThreshold || 3)
    };
  }

  res.json(streaks);
};
