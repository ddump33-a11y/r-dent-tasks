const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');

const START_DATE = '2026-03-26';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure logs directory exists
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

// --- Helpers ---

function loadManagers() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'managers.json'), 'utf8'));
}

function todayStr() {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

function dayOfWeek() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function loadLog(dateStr) {
  const file = path.join(LOGS_DIR, `${dateStr}.json`);
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return {};
}

function saveLog(dateStr, data) {
  fs.writeFileSync(path.join(LOGS_DIR, `${dateStr}.json`), JSON.stringify(data, null, 2));
}

function getManagerTasks(managerId) {
  const config = loadManagers();
  const manager = config.managers[managerId];
  if (!manager) return null;

  const today = todayStr();
  const dow = dayOfWeek();
  const weekStart = getWeekStart(today);
  const log = loadLog(today);
  const managerLog = log[managerId] || {};

  // Daily tasks (only if today is in their schedule)
  const dailyTasks = (manager.tasks.daily || [])
    .filter(t => !t.days || t.days.includes(dow))
    .map(t => ({
      ...t,
      type: 'daily',
      completed: !!(managerLog[t.id] && managerLog[t.id].completed),
      completedAt: managerLog[t.id] ? managerLog[t.id].time : null,
      notes: managerLog[t.id] ? managerLog[t.id].notes : ''
    }));

  // Weekly tasks — check all days this week for completion
  const weeklyTasks = (manager.tasks.weekly || []).map(t => {
    let completed = false;
    let completedAt = null;
    let notes = '';

    // Check each day of the current week
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayLog = loadLog(dStr);
      if (dayLog[managerId] && dayLog[managerId][t.id] && dayLog[managerId][t.id].completed) {
        completed = true;
        completedAt = dayLog[managerId][t.id].time;
        notes = dayLog[managerId][t.id].notes || '';
        break;
      }
    }

    return {
      ...t,
      type: 'weekly',
      completed,
      completedAt,
      notes
    };
  });

  return {
    manager: { id: managerId, name: manager.name, department: manager.department },
    date: today,
    dayOfWeek: dow,
    weekStart,
    tasks: { daily: dailyTasks, weekly: weeklyTasks }
  };
}

// --- API Routes ---

// Get tasks for a manager
app.get('/api/tasks/:managerId', (req, res) => {
  const data = getManagerTasks(req.params.managerId);
  if (!data) return res.status(404).json({ error: 'Manager not found' });
  res.json(data);
});

// Mark a task complete
app.post('/api/tasks/:managerId/:taskId', (req, res) => {
  const { managerId, taskId } = req.params;
  const { notes, completed } = req.body;
  const config = loadManagers();

  if (!config.managers[managerId]) {
    return res.status(404).json({ error: 'Manager not found' });
  }

  const today = todayStr();
  const log = loadLog(today);
  if (!log[managerId]) log[managerId] = {};

  if (completed === false) {
    // Undo completion
    delete log[managerId][taskId];
  } else {
    log[managerId][taskId] = {
      completed: true,
      time: new Date().toISOString(),
      notes: notes || ''
    };
  }

  saveLog(today, log);
  res.json({ success: true, task: log[managerId][taskId] || { completed: false } });
});

// Admin: Get today's status for all managers
app.get('/api/admin/today', (req, res) => {
  const config = loadManagers();
  const results = {};

  for (const managerId of Object.keys(config.managers)) {
    results[managerId] = getManagerTasks(managerId);
  }

  res.json(results);
});

// Admin: Get status for a specific date
app.get('/api/admin/date/:dateStr', (req, res) => {
  const config = loadManagers();
  const dateStr = req.params.dateStr;

  // No data before tracking started
  if (dateStr < START_DATE) {
    const results = {};
    for (const [managerId, manager] of Object.entries(config.managers)) {
      results[managerId] = {
        manager: { id: managerId, name: manager.name, department: manager.department },
        date: dateStr,
        dayOfWeek: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(dateStr + 'T00:00:00').getDay()],
        tasks: { daily: [] },
        beforeStartDate: true
      };
    }
    return res.json(results);
  }

  const log = loadLog(dateStr);
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(dateStr + 'T00:00:00').getDay()];
  const results = {};

  for (const [managerId, manager] of Object.entries(config.managers)) {
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
});

// Admin: Get historical stats
app.get('/api/admin/stats', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const config = loadManagers();
  const stats = {};

  for (const managerId of Object.keys(config.managers)) {
    stats[managerId] = {
      name: config.managers[managerId].name,
      department: config.managers[managerId].department,
      totalTasks: 0,
      completedTasks: 0,
      dailyBreakdown: []
    };
  }

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];

    // Skip weekends and days before tracking started
    if (dow === 'Sat' || dow === 'Sun') continue;
    if (dateStr < START_DATE) continue;

    const log = loadLog(dateStr);

    for (const [managerId, manager] of Object.entries(config.managers)) {
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

  // Calculate overall percentage
  for (const managerId of Object.keys(stats)) {
    const s = stats[managerId];
    s.completionPct = s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100) : 0;
  }

  res.json(stats);
});

// Admin: Get streak data (consecutive missed days)
app.get('/api/admin/streaks', (req, res) => {
  const config = loadManagers();
  const streaks = {};

  for (const [managerId, manager] of Object.entries(config.managers)) {
    let missedDays = 0;

    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
      if (dow === 'Sat' || dow === 'Sun') continue;
      if (dateStr < START_DATE) break;

      const log = loadLog(dateStr);
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
      escalation: missedDays >= (config.admin.escalationThreshold || 3)
    };
  }

  res.json(streaks);
});

// Admin: Send reminder to a manager
app.post('/api/admin/remind/:managerId', async (req, res) => {
  const config = loadManagers();
  const manager = config.managers[req.params.managerId];
  if (!manager) return res.status(404).json({ error: 'Manager not found' });

  if (!manager.email) {
    return res.status(400).json({ error: 'No email configured for this manager. Update managers.json.' });
  }

  const data = getManagerTasks(req.params.managerId);
  const incomplete = [
    ...data.tasks.daily.filter(t => !t.completed),
    ...data.tasks.weekly.filter(t => !t.completed)
  ];

  if (incomplete.length === 0) {
    return res.json({ success: true, message: 'All tasks complete — no reminder needed.' });
  }

  const taskList = incomplete.map(t => `- ${t.label}`).join('\n');
  const subject = `R-dent Task Reminder — ${incomplete.length} task(s) pending`;
  const text = `Hi ${manager.name},\n\nYou have ${incomplete.length} pending task(s) for today:\n\n${taskList}\n\nPlease complete them as soon as possible.\n\n— R-dent Task Tracker`;

  try {
    await sendEmail(manager.email, subject, text);
    res.json({ success: true, message: `Reminder sent to ${manager.email}` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
});

// Manager: Daily notes
app.get('/api/tasks/notes', (req, res) => {
  const { managerId } = req.query;
  const today = todayStr();
  const notesFile = path.join(LOGS_DIR, `notes-${today}-${managerId}.txt`);
  const notes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : '';
  res.json({ notes });
});

app.post('/api/tasks/notes', (req, res) => {
  const { managerId } = req.query;
  const { notes } = req.body;
  const today = todayStr();
  const notesFile = path.join(LOGS_DIR, `notes-${today}-${managerId}.txt`);
  fs.writeFileSync(notesFile, notes || '');
  res.json({ success: true });
});

// Admin: Get all notes for today
app.get('/api/admin/notes', (req, res) => {
  const config = loadManagers();
  const today = todayStr();
  const results = {};
  for (const managerId of Object.keys(config.managers)) {
    const notesFile = path.join(LOGS_DIR, `notes-${today}-${managerId}.txt`);
    results[managerId] = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : '';
  }
  res.json(results);
});

// --- Email ---

async function sendEmail(to, subject, text) {
  const config = loadManagers();
  // Configure your SMTP settings here
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });

  if (!process.env.SMTP_USER) {
    console.log(`[EMAIL PREVIEW] To: ${to} | Subject: ${subject}\n${text}`);
    return; // Don't attempt send without credentials
  }

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text
  });
}

// --- Page Routes ---

app.get('/m/:managerId', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- Start ---

app.listen(PORT, () => {
  console.log(`R-dent Task Tracker running on http://localhost:${PORT}`);
  console.log(`Manager URLs:`);
  const config = loadManagers();
  for (const [id, mgr] of Object.entries(config.managers)) {
    console.log(`  ${mgr.name}: http://localhost:${PORT}/m/${id}`);
  }
  console.log(`Admin dashboard: http://localhost:${PORT}/admin`);
});
