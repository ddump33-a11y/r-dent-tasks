// --- Admin Dashboard ---

let currentView = 'today';

// Nav switching
document.querySelectorAll('.admin-nav button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.admin-nav button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentView = btn.dataset.view;
    loadView();
  });
});

async function loadView() {
  const container = document.getElementById('view-container');
  container.textContent = '';

  if (currentView === 'today') await renderToday(container);
  else if (currentView === 'history') await renderHistory(container);
  else if (currentView === 'stats') await renderStats(container);

  // Check escalations
  await checkEscalations();
}

// --- Today View ---
async function renderToday(container) {
  const res = await fetch('/api/admin/today');
  const data = await res.json();

  for (const [managerId, info] of Object.entries(data)) {
    const allTasks = [...info.tasks.daily, ...info.tasks.weekly];
    const completed = allTasks.filter(t => t.completed).length;
    const total = allTasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'manager-card';

    // Header
    const header = document.createElement('div');
    header.className = 'manager-card-header';

    const nameArea = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = info.manager.name;
    const deptEl = document.createElement('div');
    deptEl.className = 'dept';
    deptEl.textContent = info.manager.department;
    nameArea.appendChild(nameEl);
    nameArea.appendChild(deptEl);
    header.appendChild(nameArea);

    const rightArea = document.createElement('div');
    rightArea.style.display = 'flex';
    rightArea.style.alignItems = 'center';
    rightArea.style.gap = '12px';

    const pctEl = document.createElement('div');
    pctEl.className = 'pct ' + (pct >= 80 ? 'good' : pct >= 50 ? 'warn' : 'bad');
    pctEl.textContent = pct + '%';
    rightArea.appendChild(pctEl);

    if (completed < total) {
      const remindBtn = document.createElement('button');
      remindBtn.className = 'remind-btn';
      remindBtn.textContent = 'Send Reminder';
      remindBtn.addEventListener('click', () => sendReminder(managerId));
      rightArea.appendChild(remindBtn);
    }

    header.appendChild(rightArea);
    card.appendChild(header);

    // Tasks
    const tasksArea = document.createElement('div');
    tasksArea.className = 'manager-card-tasks';

    allTasks.forEach(task => {
      const row = document.createElement('div');
      row.className = 'admin-task-row';

      const dot = document.createElement('span');
      dot.className = 'status-dot ' + (task.completed ? 'done' : 'pending');
      row.appendChild(dot);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'task-name';
      nameSpan.textContent = task.label;
      if (task.type === 'weekly') nameSpan.textContent += ' (Weekly)';
      row.appendChild(nameSpan);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'task-time';
      if (task.completed && task.completedAt) {
        const t = new Date(task.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        timeSpan.textContent = t;
        if (task.notes) timeSpan.textContent += ' \u2014 ' + task.notes;
      } else if (task.deadline) {
        timeSpan.textContent = 'Due: ' + task.deadline;
        timeSpan.style.color = '#d97706';
      } else {
        timeSpan.textContent = 'Pending';
        timeSpan.style.color = '#dc2626';
      }
      row.appendChild(timeSpan);

      tasksArea.appendChild(row);
    });

    card.appendChild(tasksArea);
    container.appendChild(card);
  }

  // Load notes for today
  try {
    const notesRes = await fetch('/api/admin/notes');
    const notesData = await notesRes.json();
    for (const [mid, notesText] of Object.entries(notesData)) {
      if (notesText) {
        const cards = container.querySelectorAll('.manager-card');
        const idx = Object.keys(data).indexOf(mid);
        if (idx >= 0 && cards[idx]) {
          const notesDiv = document.createElement('div');
          notesDiv.className = 'admin-notes';
          const label = document.createElement('div');
          label.className = 'admin-notes-label';
          label.textContent = 'Notes';
          notesDiv.appendChild(label);
          const text = document.createElement('div');
          text.textContent = notesText;
          notesDiv.appendChild(text);
          cards[idx].appendChild(notesDiv);
        }
      }
    }
  } catch (err) {
    // silent
  }
}

// --- History View ---
async function renderHistory(container) {
  // Date picker
  const pickerRow = document.createElement('div');
  pickerRow.className = 'date-picker-row';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = new Date().toISOString().split('T')[0];
  dateInput.min = '2026-03-26';
  pickerRow.appendChild(dateInput);

  const loadBtn = document.createElement('button');
  loadBtn.className = 'notes-submit-btn';
  loadBtn.textContent = 'Load Date';
  loadBtn.addEventListener('click', () => loadHistoryDate(dateInput.value, historyContent));
  pickerRow.appendChild(loadBtn);

  container.appendChild(pickerRow);

  const historyContent = document.createElement('div');
  container.appendChild(historyContent);

  // Load today by default
  loadHistoryDate(dateInput.value, historyContent);
}

async function loadHistoryDate(dateStr, container) {
  container.textContent = '';
  const res = await fetch('/api/admin/date/' + dateStr);
  const data = await res.json();

  const dateObj = new Date(dateStr + 'T00:00:00');
  const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const heading = document.createElement('div');
  heading.className = 'section-title';
  heading.textContent = formatted;
  heading.style.marginBottom = '16px';
  container.appendChild(heading);

  for (const [managerId, info] of Object.entries(data)) {
    const tasks = info.tasks.daily || [];
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const card = document.createElement('div');
    card.className = 'manager-card';

    const header = document.createElement('div');
    header.className = 'manager-card-header';

    const nameArea = document.createElement('div');
    const nameEl = document.createElement('div');
    nameEl.className = 'name';
    nameEl.textContent = info.manager.name;
    const deptEl = document.createElement('div');
    deptEl.className = 'dept';
    deptEl.textContent = info.manager.department;
    nameArea.appendChild(nameEl);
    nameArea.appendChild(deptEl);
    header.appendChild(nameArea);

    const pctEl = document.createElement('div');
    pctEl.className = 'pct ' + (pct >= 80 ? 'good' : pct >= 50 ? 'warn' : 'bad');
    pctEl.textContent = total > 0 ? pct + '%' : 'N/A';
    header.appendChild(pctEl);
    card.appendChild(header);

    if (tasks.length > 0) {
      const tasksArea = document.createElement('div');
      tasksArea.className = 'manager-card-tasks';
      tasks.forEach(task => {
        const row = document.createElement('div');
        row.className = 'admin-task-row';
        const dot = document.createElement('span');
        dot.className = 'status-dot ' + (task.completed ? 'done' : 'pending');
        row.appendChild(dot);
        const nameSpan = document.createElement('span');
        nameSpan.className = 'task-name';
        nameSpan.textContent = task.label;
        row.appendChild(nameSpan);
        const timeSpan = document.createElement('span');
        timeSpan.className = 'task-time';
        if (task.completed && task.completedAt) {
          timeSpan.textContent = new Date(task.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
        row.appendChild(timeSpan);
        tasksArea.appendChild(row);
      });
      card.appendChild(tasksArea);
    } else {
      const empty = document.createElement('div');
      empty.className = 'manager-card-tasks';
      empty.style.padding = '16px 20px';
      empty.style.color = '#9ca3af';
      empty.textContent = 'No tasks scheduled for this day';
      card.appendChild(empty);
    }

    container.appendChild(card);
  }
}

// --- Stats View ---
async function renderStats(container) {
  // Period selector
  const pickerRow = document.createElement('div');
  pickerRow.className = 'date-picker-row';

  const select = document.createElement('select');
  [{ v: '7', l: 'Last 7 days' }, { v: '14', l: 'Last 14 days' }, { v: '30', l: 'Last 30 days' }, { v: '60', l: 'Last 60 days' }, { v: '90', l: 'Last 90 days' }].forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.v;
    o.textContent = opt.l;
    if (opt.v === '30') o.selected = true;
    select.appendChild(o);
  });

  select.addEventListener('change', () => loadStats(select.value, statsContent));
  pickerRow.appendChild(select);
  container.appendChild(pickerRow);

  const statsContent = document.createElement('div');
  container.appendChild(statsContent);

  loadStats('30', statsContent);
}

async function loadStats(days, container) {
  container.textContent = '';
  const res = await fetch('/api/admin/stats?days=' + days);
  const data = await res.json();

  // Summary cards
  const grid = document.createElement('div');
  grid.className = 'stats-grid';

  for (const [managerId, stats] of Object.entries(data)) {
    const card = document.createElement('div');
    card.className = 'stat-card';

    const labelEl = document.createElement('div');
    labelEl.className = 'stat-label';
    labelEl.textContent = stats.name + ' \u2014 ' + stats.department;
    card.appendChild(labelEl);

    const valueEl = document.createElement('div');
    valueEl.className = 'stat-value';
    valueEl.textContent = stats.completionPct + '%';
    valueEl.style.color = stats.completionPct >= 80 ? '#059669' : stats.completionPct >= 50 ? '#d97706' : '#dc2626';
    card.appendChild(valueEl);

    const subEl = document.createElement('div');
    subEl.className = 'stat-sub';
    subEl.textContent = stats.completedTasks + ' of ' + stats.totalTasks + ' tasks completed';
    card.appendChild(subEl);

    // Daily breakdown bars
    const barsContainer = document.createElement('div');
    barsContainer.style.marginTop = '16px';

    const breakdown = stats.dailyBreakdown.slice(0, 10); // last 10 working days
    breakdown.forEach(day => {
      const bar = document.createElement('div');
      bar.className = 'history-bar';

      const dateSpan = document.createElement('span');
      dateSpan.className = 'bar-date';
      const d = new Date(day.date + 'T00:00:00');
      dateSpan.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      bar.appendChild(dateSpan);

      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill ' + (day.pct >= 80 ? 'good' : day.pct >= 50 ? 'warn' : 'bad');
      fill.style.width = day.pct + '%';
      track.appendChild(fill);
      bar.appendChild(track);

      const pctSpan = document.createElement('span');
      pctSpan.className = 'bar-pct';
      pctSpan.textContent = day.pct + '%';
      bar.appendChild(pctSpan);

      barsContainer.appendChild(bar);
    });

    card.appendChild(barsContainer);
    grid.appendChild(card);
  }

  container.appendChild(grid);
}

// --- Escalations ---
async function checkEscalations() {
  const area = document.getElementById('escalation-area');
  area.textContent = '';

  try {
    const res = await fetch('/api/admin/streaks');
    const data = await res.json();

    for (const [managerId, info] of Object.entries(data)) {
      if (info.escalation) {
        const banner = document.createElement('div');
        banner.className = 'escalation-banner';
        banner.textContent = '\u26a0\ufe0f ' + info.name + ' has missed tasks for ' + info.consecutiveMissedDays + ' consecutive days';
        area.appendChild(banner);
      }
    }
  } catch (err) {
    // silently fail
  }
}

// --- Send Reminder ---
async function sendReminder(managerId) {
  try {
    const res = await fetch('/api/admin/remind/' + managerId, { method: 'POST' });
    const data = await res.json();
    showToast(data.message || data.error);
  } catch (err) {
    showToast('Failed to send reminder');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// Init
loadView();
