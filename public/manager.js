// --- Manager Task View ---

const managerId = window.location.pathname.split('/m/')[1];
let taskData = null;

function createCheckSvg() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', '20 6 9 17 4 12');
  svg.appendChild(polyline);
  return svg;
}

async function loadTasks() {
  try {
    const res = await fetch(`/api/tasks/${managerId}`);
    if (!res.ok) {
      const app = document.getElementById('app');
      app.textContent = '';
      const div = document.createElement('div');
      div.className = 'empty-state';
      const h2 = document.createElement('h2');
      h2.textContent = 'Manager not found';
      const p = document.createElement('p');
      p.textContent = 'Check the URL and try again.';
      div.appendChild(h2);
      div.appendChild(p);
      app.appendChild(div);
      return;
    }
    taskData = await res.json();
    render();
  } catch (err) {
    const app = document.getElementById('app');
    app.textContent = '';
    const div = document.createElement('div');
    div.className = 'empty-state';
    const h2 = document.createElement('h2');
    h2.textContent = 'Connection error';
    const p = document.createElement('p');
    p.textContent = 'Please check your connection and reload.';
    div.appendChild(h2);
    div.appendChild(p);
    app.appendChild(div);
  }
}

function render() {
  const { manager, date, dayOfWeek, tasks } = taskData;

  // Header
  document.getElementById('manager-name').textContent = manager.name;
  document.getElementById('manager-dept').textContent = manager.department;

  const dateObj = new Date(date + 'T00:00:00');
  const formatted = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  document.getElementById('date-badge').textContent = formatted;

  // Progress
  const allTasks = [...tasks.daily, ...tasks.weekly];
  const completedCount = allTasks.filter(t => t.completed).length;
  const totalCount = allTasks.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${completedCount} of ${totalCount} complete (${pct}%)`;

  // Daily tasks
  const dailyContainer = document.getElementById('daily-tasks');
  dailyContainer.textContent = '';
  if (tasks.daily.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No daily tasks today';
    dailyContainer.appendChild(empty);
  } else {
    tasks.daily.forEach(t => dailyContainer.appendChild(buildTaskCard(t)));
  }

  // Weekly tasks
  const weeklyContainer = document.getElementById('weekly-tasks');
  weeklyContainer.textContent = '';
  if (tasks.weekly.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No weekly tasks this week';
    weeklyContainer.appendChild(empty);
  } else {
    tasks.weekly.forEach(t => weeklyContainer.appendChild(buildTaskCard(t)));
  }
}

function buildTaskCard(task) {
  const card = document.createElement('div');
  card.className = 'task-card' + (task.completed ? ' completed' : '');
  card.dataset.taskId = task.id;

  // Checkbox
  const checkbox = document.createElement('div');
  checkbox.className = 'task-checkbox';
  checkbox.appendChild(createCheckSvg());
  card.appendChild(checkbox);

  // Content
  const content = document.createElement('div');
  content.className = 'task-content';

  const label = document.createElement('div');
  label.className = 'task-label';
  label.textContent = task.label + (task.type === 'weekly' ? ' (Weekly)' : '');
  content.appendChild(label);

  // Meta
  const meta = document.createElement('div');
  meta.className = 'task-meta';

  if (task.completed && task.completedAt) {
    const time = new Date(task.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const timeSpan = document.createElement('span');
    timeSpan.className = 'completed-time';
    timeSpan.textContent = 'Completed at ' + time;
    meta.appendChild(timeSpan);
    if (task.notes) {
      meta.appendChild(document.createTextNode(' \u2014 ' + task.notes));
    }
  } else if (task.deadline && !task.completed) {
    const deadlineSpan = document.createElement('span');
    deadlineSpan.className = 'deadline';
    deadlineSpan.textContent = 'Due by ' + task.deadline;
    meta.appendChild(deadlineSpan);
  }
  content.appendChild(meta);

  // Notes input for requiresTimeEntry tasks
  if (task.requiresTimeEntry && !task.completed) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-notes-input';
    input.placeholder = task.prompt || 'Add details...';
    content.appendChild(input);

    const btn = document.createElement('button');
    btn.className = 'notes-submit-btn';
    btn.textContent = 'Complete';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const notes = input.value.trim();
      if (!notes) {
        input.focus();
        input.style.borderColor = '#dc2626';
        return;
      }
      toggleTask(task.id, true, notes);
    });
    content.appendChild(btn);

    // Prevent card click from toggling for time-entry tasks
    input.addEventListener('click', (e) => e.stopPropagation());
  } else if (!task.requiresTimeEntry) {
    card.addEventListener('click', () => {
      toggleTask(task.id, !task.completed);
    });
  }

  card.appendChild(content);
  return card;
}

async function toggleTask(taskId, completed, notes) {
  try {
    const res = await fetch(`/api/tasks/${managerId}/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed, notes: notes || '' })
    });

    if (res.ok) {
      showToast(completed ? 'Task completed!' : 'Task unchecked');
      loadTasks();
    }
  } catch (err) {
    showToast('Error saving \u2014 please try again');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

// Init
loadTasks();
