// 1. Sample data and two small helpers. The page markup is in index.html.
export const storageKey = 'focuslearn-simple-v1';
export function sampleData() {
  return {
    tasks: [
      { id: 'task-1', title: 'Practice JavaScript arrays', done: false },
      { id: 'task-2', title: 'Read one chapter', done: false },
      { id: 'task-3', title: 'Review vocabulary', done: true },
    ],
    notes: [
      { id: 'note-1', title: 'HTML and JavaScript', text: 'HTML describes the page.\nJavaScript makes buttons and forms work.' },
      { id: 'note-2', title: 'Study routine', text: 'Pick one task.\nFocus for 25 minutes.\nWrite down what you learned.' },
    ],
    timer: { duration: 1500, elapsed: 0, runningSince: null },
    theme: 'light',
  };
}
export function remainingSeconds(timer, now = Date.now()) {
  const active = timer.runningSince === null ? 0 : Math.max(0, (now - timer.runningSince) / 1000);
  return Math.max(0, Math.ceil(timer.duration - timer.elapsed - active));
}
export function readData(value) {
  const validRows = (rows, valid) => Array.isArray(rows) && rows.every(row => row && typeof row.id === 'string' && valid(row)) && new Set(rows.map(row => row.id)).size === rows.length;
  if (!value || !validRows(value.tasks, task => typeof task.title === 'string' && typeof task.done === 'boolean') ||
      !validRows(value.notes, note => typeof note.title === 'string' && typeof note.text === 'string')) throw new Error('Saved tasks or notes could not be read.');
  const data = sampleData();
  data.tasks = value.tasks;
  data.notes = value.notes;
  if (value.timer && (!value.timer.mode || value.timer.mode === 'timed')) {
    const timer = value.timer;
    if (!Number.isFinite(timer.duration) || timer.duration < 60 || timer.duration > 10800 ||
        !Number.isFinite(timer.elapsed) || timer.elapsed < 0 ||
        !(timer.runningSince === null || Number.isFinite(timer.runningSince))) throw new Error('Saved timer could not be read.');
    data.timer = { duration: timer.duration, elapsed: timer.elapsed, runningSince: timer.runningSince };
  }
  if (value.theme === 'dark' || value.settings?.theme === 'dark') data.theme = 'dark';
  return data;
}

function startApp() {
  // 2. Read browser storage. Keep the previous version's data as a backup.
  const $ = selector => document.querySelector(selector);
  let data = sampleData();
  let blocked = false;
  let selectedNote = null;
  let dirty = false;
  const feedback = text => { $('#feedback').textContent = text; };
  function attempt(work) {
    feedback('');
    try { work(); } catch (error) { feedback(error.message); }
  }
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('focuslearn-showcase-v1');
    if (saved) data = readData(JSON.parse(saved));
  } catch {
    blocked = true;
    feedback('Saved data could not be read. Examples are shown. Use Reset examples to start again.');
  }
  function save(next) {
    if (blocked) throw new Error('Use Reset examples before editing unreadable saved data.');
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { throw new Error('Could not save. Allow browser storage or free up space, then try again.'); }
    data = next;
  }
  function change(edit) {
    const next = structuredClone(data);
    edit(next);
    save(next);
  }
  function copyTemplate(id) { return $(id).content.firstElementChild.cloneNode(true); }

  // 3. Tasks: add, check off, delete.
  function showTasks() {
    $('#task-list').replaceChildren();
    for (const task of data.tasks) {
      const row = copyTemplate('#task-template');
      const check = row.querySelector('input');
      const title = row.querySelector('span');
      title.textContent = task.title;
      title.classList.toggle('done', task.done);
      check.checked = task.done;
      check.onchange = () => attempt(() => {
        try { change(next => { next.tasks.find(item => item.id === task.id).done = check.checked; }); }
        finally {
          check.checked = data.tasks.find(item => item.id === task.id).done;
          title.classList.toggle('done', check.checked);
        }
      });
      row.querySelector('button').onclick = () => attempt(() => {
        change(next => { next.tasks = next.tasks.filter(item => item.id !== task.id); });
        showTasks();
      });
      $('#task-list').append(row);
    }
    $('#tasks-empty').hidden = data.tasks.length > 0;
  }
  $('#task-form').onsubmit = event => {
    event.preventDefault();
    attempt(() => {
      const title = $('#task-title').value.trim();
      if (!title) throw new Error('Write a task first.');
      change(next => next.tasks.push({ id: crypto.randomUUID(), title, done: false }));
      $('#task-form').reset();
      showTasks();
    });
  };

  // 4. Notes: open one, edit it, save it. Blank editor creates a new note.
  function leaveNote() { return !dirty || confirm('Discard unsaved note changes?'); }
  function clearEditor() {
    selectedNote = null;
    dirty = false;
    $('#note-form').reset();
    $('#save-note').textContent = 'Add note';
    $('#note-status').textContent = '';
  }
  function showNotes() {
    $('#note-list').replaceChildren();
    for (const note of data.notes) {
      const row = copyTemplate('#note-template');
      row.querySelector('.open-note').textContent = note.title || 'Untitled note';
      row.querySelector('.open-note').onclick = () => {
        if (!leaveNote()) return;
        selectedNote = note.id;
        dirty = false;
        $('#note-title').value = note.title;
        $('#note-text').value = note.text;
        $('#save-note').textContent = 'Save note';
        $('#note-status').textContent = '';
        $('#note-title').focus();
      };
      row.querySelector('.delete-note').onclick = () => attempt(() => {
        if (!confirm(`Delete “${note.title}”?`)) return;
        change(next => { next.notes = next.notes.filter(item => item.id !== note.id); });
        if (selectedNote === note.id) clearEditor();
        showNotes();
      });
      $('#note-list').append(row);
    }
    $('#notes-empty').hidden = data.notes.length > 0;
  }
  $('#note-form').oninput = () => { dirty = true; $('#note-status').textContent = 'Unsaved changes'; };
  $('#note-form').onsubmit = event => {
    event.preventDefault();
    attempt(() => {
      const note = { id: selectedNote || crypto.randomUUID(), title: $('#note-title').value.trim(), text: $('#note-text').value };
      if (!note.title) throw new Error('Give your note a title.');
      change(next => {
        const index = next.notes.findIndex(item => item.id === note.id);
        if (index < 0) next.notes.push(note); else next.notes[index] = note;
      });
      selectedNote = note.id;
      dirty = false;
      $('#save-note').textContent = 'Save note';
      $('#note-status').textContent = 'Saved';
      showNotes();
    });
  };
  $('#new-note').onclick = () => { if (leaveNote()) clearEditor(); };
  window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });

  // 5. Countdown: Start / Pause / Resume, plus Reset.
  function showTimer() {
    const seconds = remainingSeconds(data.timer);
    const running = data.timer.runningSince !== null;
    $('#timer').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    $('#start-timer').textContent = running ? 'Pause timer' : data.timer.elapsed ? 'Resume timer' : 'Start timer';
    $('#start-timer').disabled = seconds === 0;
    $('#minutes').disabled = running || data.timer.elapsed > 0;
    $('#timer-status').textContent = seconds === 0 ? 'Time is up. Take a short break.' : running ? 'Focus on one task.' : data.timer.elapsed ? 'Paused.' : 'Choose a few minutes for one task.';
  }
  $('#timer-form').onsubmit = event => {
    event.preventDefault();
    attempt(() => {
      change(next => {
        const timer = next.timer;
        if (timer.runningSince !== null) {
          timer.elapsed = timer.duration - remainingSeconds(timer);
          timer.runningSince = null;
        } else {
          if (timer.elapsed === 0) timer.duration = Number($('#minutes').value) * 60;
          timer.runningSince = Date.now();
        }
      });
      showTimer();
    });
  };
  $('#reset-timer').onclick = () => attempt(() => {
    change(next => { next.timer = { duration: data.timer.duration, elapsed: 0, runningSince: null }; });
    $('#minutes').value = data.timer.duration / 60;
    showTimer();
  });
  setInterval(showTimer, 1000);

  // 6. Theme and a single reset button. No settings screen.
  function showTheme() {
    document.documentElement.dataset.theme = data.theme;
    $('#theme').setAttribute('aria-pressed', String(data.theme === 'dark'));
  }
  $('#theme').onclick = () => attempt(() => {
    change(next => { next.theme = data.theme === 'dark' ? 'light' : 'dark'; });
    showTheme();
  });
  $('#reset-data').onclick = () => attempt(() => {
    if (!confirm('Replace tasks, notes and the timer with the examples?')) return;
    const wasBlocked = blocked;
    blocked = false;
    try { save(sampleData()); } catch (error) { blocked = wasBlocked; throw error; }
    clearEditor();
    $('#minutes').value = 25;
    showTasks(); showNotes(); showTimer(); showTheme();
    feedback('Examples restored.');
  });
  $('#date').textContent = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(new Date());
  $('#minutes').value = data.timer.duration / 60;
  showTasks(); showNotes(); showTimer(); showTheme();
  $('#loading').hidden = true;
}

// This guard also lets unit tests import the helpers without a browser.
if (typeof document !== 'undefined') startApp();
