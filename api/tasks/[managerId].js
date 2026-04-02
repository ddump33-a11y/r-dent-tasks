const { MANAGERS } = require('../_lib/managers');
const { loadLog, todayStr, dayOfWeek, getWeekStart } = require('../_lib/storage');

module.exports = async function handler(req, res) {
  const { managerId } = req.query;
  const manager = MANAGERS[managerId];
  if (!manager) return res.status(404).json({ error: 'Manager not found' });

  const today = todayStr();
  const dow = dayOfWeek(today);
  const weekStart = getWeekStart(today);
  const log = await loadLog(today);
  const managerLog = log[managerId] || {};

  const dailyTasks = (manager.tasks.daily || [])
    .filter(t => !t.days || t.days.includes(dow))
    .map(t => ({
      ...t,
      type: 'daily',
      completed: !!(managerLog[t.id] && managerLog[t.id].completed),
      completedAt: managerLog[t.id] ? managerLog[t.id].time : null,
      notes: managerLog[t.id] ? managerLog[t.id].notes : ''
    }));

  // Weekly tasks — check all days this week, filter by day if specified
  const weeklyTasks = [];
  for (const t of (manager.tasks.weekly || [])) {
    // Skip weekly tasks that have day-of-week restrictions and today isn't one of those days
    if (t.days && !t.days.includes(dow)) continue;

    let completed = false, completedAt = null, notes = '';

    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T12:00:00');
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayLog = await loadLog(dStr);
      if (dayLog[managerId] && dayLog[managerId][t.id] && dayLog[managerId][t.id].completed) {
        completed = true;
        completedAt = dayLog[managerId][t.id].time;
        notes = dayLog[managerId][t.id].notes || '';
        break;
      }
    }

    weeklyTasks.push({ ...t, type: 'weekly', completed, completedAt, notes });
  }

  res.json({
    manager: { id: managerId, name: manager.name, department: manager.department },
    date: today,
    dayOfWeek: dow,
    weekStart,
    tasks: { daily: dailyTasks, weekly: weeklyTasks }
  });
};
