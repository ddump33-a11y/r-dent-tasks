#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const LOGS_DIR = path.join(DATA_DIR, 'logs');

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function dayOfWeek() {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()];
}

function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

function loadManagers() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'managers.json'), 'utf8'));
}

function getMissedDays(managerId, manager) {
  let missed = 0;
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
    if (dow === 'Sat' || dow === 'Sun') continue;
    const log = loadLog(dateStr);
    const managerLog = log[managerId] || {};
    const tasks = (manager.tasks.daily || []).filter(t => !t.days || t.days.includes(dow));
    if (tasks.length === 0) continue;
    const allDone = tasks.every(t => managerLog[t.id] && managerLog[t.id].completed);
    if (!allDone) missed++;
    else break;
  }
  return missed;
}

// --- Main ---
const today = todayStr();
const dow = dayOfWeek();
const config = loadManagers();
const todayLog = loadLog(today);
const weekStart = getWeekStart(today);

const lines = [];
lines.push('');
lines.push('=== CEO MORNING BRIEFING ===');
lines.push(`Date: ${today} (${dow})`);
lines.push('');

if (dow === 'Sat' || dow === 'Sun') {
  lines.push('Weekend — no manager tasks scheduled.');
  lines.push('');
  lines.push('80/20 SUGGESTION: Use this time for strategic thinking.');
  lines.push('  - Review weekly KPIs and prep for Monday L10');
  lines.push('  - Check competitor pricing or DSO pipeline');
  console.log(lines.join('\n'));
  process.exit(0);
}

// --- Incomplete tasks per manager ---
let totalIncomplete = 0;
const managerIssues = [];

lines.push('MANAGER TASK STATUS:');
lines.push('-'.repeat(50));

for (const [id, manager] of Object.entries(config.managers)) {
  const managerLog = todayLog[id] || {};
  const dailyTasks = (manager.tasks.daily || []).filter(t => !t.days || t.days.includes(dow));
  const incomplete = dailyTasks.filter(t => !(managerLog[t.id] && managerLog[t.id].completed));
  const completed = dailyTasks.length - incomplete.length;
  const missedDays = getMissedDays(id, manager);

  const status = incomplete.length === 0 ? 'ALL DONE' : `${incomplete.length} PENDING`;
  const streak = missedDays >= config.admin.escalationThreshold ? ` *** ${missedDays} CONSECUTIVE MISSED DAYS ***` : '';
  lines.push(`  ${manager.name} (${manager.department}): ${completed}/${dailyTasks.length} done — ${status}${streak}`);

  if (incomplete.length > 0) {
    totalIncomplete += incomplete.length;
    for (const t of incomplete) {
      lines.push(`    - ${t.label}${t.deadline ? ' (due ' + t.deadline + ')' : ''}`);
    }
    managerIssues.push({ id, name: manager.name, department: manager.department, incomplete, missedDays });
  }
}

// --- Weekly tasks check ---
lines.push('');
lines.push('WEEKLY TASKS:');
lines.push('-'.repeat(50));
for (const [id, manager] of Object.entries(config.managers)) {
  const weeklyTasks = manager.tasks.weekly || [];
  for (const t of weeklyTasks) {
    let done = false;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart + 'T00:00:00');
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const dayLog = loadLog(dStr);
      if (dayLog[id] && dayLog[id][t.id] && dayLog[id][t.id].completed) {
        done = true;
        break;
      }
    }
    if (!done) {
      lines.push(`  ${manager.name}: ${t.label}${t.deadline ? ' (due ' + t.deadline + ')' : ''} — NOT DONE`);
    }
  }
}

// --- 80/20 suggestions ---
lines.push('');
lines.push('80/20 HIGH-LEVERAGE ACTIONS:');
lines.push('-'.repeat(50));

const suggestions = [];

// Escalation-worthy managers
const escalations = managerIssues.filter(m => m.missedDays >= config.admin.escalationThreshold);
if (escalations.length > 0) {
  for (const m of escalations) {
    suggestions.push(`ESCALATE: ${m.name} has missed ${m.missedDays} consecutive days. A 5-min direct conversation will fix more than 10 reminder emails.`);
  }
}

// Friday-specific
if (dow === 'Fri') {
  suggestions.push('FRIDAY: Confirm all L10 to-do reviews are done before EOD. Monday meetings go 2x smoother when prep is done.');
  suggestions.push('FRIDAY: Block 15 min to review this week\'s completion rates across all managers — spot patterns before they become problems.');
}

// Monday-specific
if (dow === 'Mon') {
  suggestions.push('MONDAY: Check who completed their Friday L10 to-do reviews. Anyone who didn\'t is going into Monday\'s meeting unprepared.');
}

// General high-leverage suggestions based on what's happening
if (totalIncomplete === 0) {
  suggestions.push('All daily tasks done. Use your time on revenue-generating activities: DSO outreach, pricing reviews, or sales coaching.');
} else if (totalIncomplete <= 2) {
  suggestions.push(`Only ${totalIncomplete} task(s) pending. A quick Slack check-in with those managers will close the gap faster than waiting.`);
} else {
  suggestions.push(`${totalIncomplete} tasks pending across the team. Check if it\'s a pattern or a one-off — patterns need a process fix, one-offs need a nudge.`);
}

// Missing emails
const noEmail = Object.entries(config.managers).filter(([_, m]) => !m.email);
if (noEmail.length > 0) {
  suggestions.push(`${noEmail.length} manager(s) have no email configured (${noEmail.map(([_, m]) => m.name).join(', ')}). Add emails to managers.json to enable automated reminders — 2 minutes of setup saves daily follow-up.`);
}

for (let i = 0; i < Math.min(suggestions.length, 3); i++) {
  lines.push(`  ${i + 1}. ${suggestions[i]}`);
}

lines.push('');
lines.push('='.repeat(50));
lines.push('');

console.log(lines.join('\n'));
