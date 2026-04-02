const { MANAGERS, START_DATE } = require('../_lib/managers');
const { loadLog, dayOfWeek } = require('../_lib/storage');

module.exports = async function handler(req, res) {
  const days = parseInt(req.query.days) || 30;
  const stats = {};

  for (const managerId of Object.keys(MANAGERS)) {
    stats[managerId] = {
      name: MANAGERS[managerId].name,
      department: MANAGERS[managerId].department,
      totalTasks: 0,
      completedTasks: 0,
      dailyBreakdown: []
    };
  }

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    // Skip days before tracking started
    if (dateStr < START_DATE) continue;
    const dow = dayOfWeek(dateStr);

    if (dow === 'Sat' || dow === 'Sun') continue;

    const log = await loadLog(dateStr);

    for (const [managerId, manager] of Object.entries(MANAGERS)) {
      // Skip days before this manager's start date
      const mgrStart = manager.startDate || START_DATE;
      if (dateStr < mgrStart) continue;

      const managerLog = log[managerId] || {};
      const applicableTasks = (manager.tasks.daily || []).filter(t => !t.days || t.days.includes(dow));
      const total = applicableTasks.length;
      const completed = applicableTasks.filter(t => managerLog[t.id] && managerLog[t.id].completed).length;

      stats[managerId].totalTasks += total;
      stats[managerId].completedTasks += completed;
      stats[managerId].dailyBreakdown.push({
        date: dateStr,
        total,
        completed,
        pct: total > 0 ? Math.round((completed / total) * 100) : 0
      });
    }
  }

  for (const managerId of Object.keys(stats)) {
    const s = stats[managerId];
    s.completionPct = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
  }

  res.json(stats);
};
