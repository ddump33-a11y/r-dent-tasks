const { kv } = require('@vercel/kv');

async function loadLog(dateStr) {
  try {
    const data = await kv.get(`log:${dateStr}`);
    return data || {};
  } catch (err) {
    console.error('KV read error:', err.message);
    return {};
  }
}

async function saveLog(dateStr, data) {
  try {
    await kv.set(`log:${dateStr}`, data);
  } catch (err) {
    console.error('KV write error:', err.message);
    throw err;
  }
}

function todayStr() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return now.toISOString().split('T')[0];
}

function dayOfWeek(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }));
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday.toISOString().split('T')[0];
}

module.exports = { loadLog, saveLog, todayStr, dayOfWeek, getWeekStart };
