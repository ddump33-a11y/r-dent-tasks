const { MANAGERS, START_DATE } = require('../../_lib/managers');
const { loadLog, dayOfWeek } = require('../../_lib/storage');

module.exports = async function handler(req, res) {
  const { dateStr } = req.query;

  // No data before tracking started
  if (dateStr < START_DATE) {
    const results = {};
    for (const [managerId, manager] of Object.entries(MANAGERS)) {
      results[managerId] = {
        manager: { id: managerId, name: manager.name, department: manager.department },
        date: dateStr,
        dayOfWeek: dayOfWeek(dateStr),
        tasks: { daily: [] },
        beforeStartDate: true
      };
    }
    return res.json(results);
  }
  const log = await loadLog(dateStr);
  const dow = dayOfWeek(dateStr);
  const results = {};

  for (const [managerId, manager] of Object.entries(MANAGERS)) {
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

    results[managerId] = {
      manager: { id: managerId, name: manager.name, department: manager.department },
      date: dateStr,
      dayOfWeek: dow,
      tasks: { daily: dailyTasks }
    };
  }

  res.json(results);
};
