// 1. Sample data and two small helpers. The page markup is in index.html.
const storageKey = 'focuslearn-simple-v1';
function sampleData() {
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
function remainingSeconds(timer, now = Date.now()) {
  const active = timer.runningSince === null ? 0 : Math.max(0, (now - timer.runningSince) / 1000);
  return Math.max(0, Math.ceil(timer.duration - timer.elapsed - active));
}
// Check saved data before using it. Broken data should never overwrite the backup.
function readData(value) {
  function validRows(rows, fieldsAreValid) {
    if (!Array.isArray(rows)) return false;

    const ids = new Set();
    for (const row of rows) {
      if (!row || typeof row.id !== 'string' || !fieldsAreValid(row)) return false;
      if (ids.has(row.id)) return false;
      ids.add(row.id);
    }
    return true;
  }

  const tasksAreValid = value && validRows(value.tasks, task =>
    typeof task.title === 'string' && typeof task.done === 'boolean'
  );
  const notesAreValid = value && validRows(value.notes, note =>
    typeof note.title === 'string' && typeof note.text === 'string'
  );
  if (!tasksAreValid || !notesAreValid) {
    throw new Error('Saved tasks or notes could not be read.');
  }

  const data = sampleData();
  data.tasks = value.tasks;
  data.notes = value.notes;

  // Older versions may have used a different type of timer.
  const timer = value.timer;
  if (timer && (!timer.mode || timer.mode === 'timed')) {
    const validDuration = Number.isFinite(timer.duration) && timer.duration >= 60 && timer.duration <= 10800;
    const validElapsed = Number.isFinite(timer.elapsed) && timer.elapsed >= 0;
    const validStart = timer.runningSince === null || Number.isFinite(timer.runningSince);
    if (!validDuration || !validElapsed || !validStart) {
      throw new Error('Saved timer could not be read.');
    }
    data.timer = { duration: timer.duration, elapsed: timer.elapsed, runningSince: timer.runningSince };
  }
  const session = value.focusSession;
  if (session && typeof session.id === 'string' && typeof session.taskTitle === 'string' &&
      typeof session.date === 'string' && typeof session.time === 'string' &&
      Number.isInteger(session.minutes) && session.minutes >= 1 && session.minutes <= 180) {
    data.focusSession = { ...session, taskId: typeof session.taskId === 'string' ? session.taskId : '' };
  }
  if (value.theme === 'dark' || value.settings?.theme === 'dark') data.theme = 'dark';
  return data;
}

function startApp() {
  // 2. Read browser storage. Keep the previous version's data as a backup.
  // Use $('selector') as a short way to find an element on the page.
  const $ = selector => document.querySelector(selector);
  let data = sampleData();
  let blocked = false;
  let selectedNote = null;
  let dirty = false;
  let selectedFocusTaskId = '';
  let zenActive = false;
  let savedScroll = { x: 0, y: 0 };
  let savedBodyOverflow = '';
  let savedFocusAttrs = { role: null, ariaModal: null, ariaLabelledby: null };
  let savedBackground = [];

  const focusFeedback = text => {
    if ($('#focus-feedback')) $('#focus-feedback').textContent = text;
  };
  const feedback = (text, isFocus = false) => {
    $('#feedback').textContent = text;
    if (isFocus || zenActive) focusFeedback(text);
  };
  function attempt(work, isFocus = false) {
    feedback('');
    focusFeedback('');
    try { work(); } catch (error) { feedback(error.message, isFocus); }
  }
  try {
    const saved = localStorage.getItem(storageKey) || localStorage.getItem('focuslearn-showcase-v1');
    if (saved) data = readData(JSON.parse(saved));
  } catch {
    blocked = true;
    feedback('Saved data could not be read. Examples are shown. Use Reset examples to start again.', true);
  }
  selectedFocusTaskId = data.focusSession?.taskId || '';
  function save(next) {
    if (blocked) throw new Error('Use Reset examples before editing unreadable saved data.');
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { throw new Error('Could not save. Allow browser storage or free up space, then try again.'); }
    data = next;
  }
  // Edit a copy first, so a failed save does not change what the page shows.
  function change(edit) {
    const next = structuredClone(data);
    edit(next);
    save(next);
  }
  function copyTemplate(id) { return $(id).content.firstElementChild.cloneNode(true); }

  // 3. Tasks: add, check off, delete, and sync the Focus task selector.
  function showFocusTasks() {
    const openTasks = data.tasks.filter(task => !task.done);
    const total = data.tasks.length;
    if ($('#tasks-count')) {
      $('#tasks-count').textContent = total === 0 ? '0 tasks' : `${openTasks.length} of ${total} left`;
    }
    const currentTask = openTasks.find(task => task.id === selectedFocusTaskId);
    if (!currentTask) selectedFocusTaskId = '';

    const select = $('#focus-task');
    if (select) {
      select.replaceChildren();
      const noneOption = document.createElement('option');
      noneOption.value = '';
      noneOption.textContent = 'Focus without a task';
      select.append(noneOption);
      for (const task of openTasks) {
        const option = document.createElement('option');
        option.value = task.id;
        option.textContent = task.title;
        select.append(option);
      }
      select.value = selectedFocusTaskId;
      select.disabled = data.timer.runningSince !== null || data.timer.elapsed > 0;
    }

    const taskName = $('#focus-task-name');
    if (taskName) {
      taskName.textContent = currentTask ? currentTask.title : '';
      taskName.hidden = !currentTask;
    }
  }
  function showTasks() {
    $('#task-list').replaceChildren();
    for (const task of data.tasks) {
      const row = copyTemplate('#task-template');
      const check = row.querySelector('input');
      const title = row.querySelector('span');
      title.textContent = task.title;
      title.classList.toggle('done', task.done);
      check.checked = task.done;
      check.onchange = () => {
        attempt(() => {
          change(next => {
            const savedTask = next.tasks.find(item => item.id === task.id);
            savedTask.done = check.checked;
          });
        });
        // Restore the checkbox if saving failed.
        check.checked = data.tasks.find(item => item.id === task.id).done;
        title.classList.toggle('done', check.checked);
        showFocusTasks();
      };
      row.querySelector('button').onclick = () => attempt(() => {
        change(next => { next.tasks = next.tasks.filter(item => item.id !== task.id); });
        showTasks();
        showFocusTasks();
      });
      $('#task-list').append(row);
    }
    $('#tasks-empty').hidden = data.tasks.length > 0;
  }
  if ($('#task-form')) $('#task-form').noValidate = true;
  $('#task-form').onsubmit = event => {
    event.preventDefault();
    attempt(() => {
      const title = $('#task-title').value.trim();
      if (!title) throw new Error('Write a task first.');
      change(next => next.tasks.push({ id: crypto.randomUUID(), title, done: false }));
      $('#task-form').reset();
      showTasks();
      showFocusTasks();
      $('#task-title').focus();
    });
  };
  if ($('#focus-task')) {
    $('#focus-task').onchange = () => {
      selectedFocusTaskId = $('#focus-task').value;
      showFocusTasks();
    };
  }

  // 4. Notes: open one, edit it, save it. Blank editor creates a new note.
  function setNoteHeading(text) {
    if ($('#note-editor-heading')) $('#note-editor-heading').textContent = text;
  }
  function leaveNote() { return !dirty || confirm('Discard unsaved note changes?'); }
  function clearEditor() {
    selectedNote = null;
    dirty = false;
    $('#note-form').reset();
    $('#save-note').textContent = 'Add note';
    $('#note-status').textContent = '';
    setNoteHeading('New note');
    showNotes();
  }
  function showNotes() {
    $('#note-list').replaceChildren();
    for (const note of data.notes) {
      const row = copyTemplate('#note-template');
      const isSelected = note.id === selectedNote;
      const openButton = row.querySelector('.open-note');
      row.classList.toggle('is-selected', isSelected);
      openButton.classList.toggle('is-selected', isSelected);
      openButton.textContent = note.title || 'Untitled note';
      openButton.onclick = () => {
        if (!leaveNote()) return;
        selectedNote = note.id;
        dirty = false;
        $('#note-title').value = note.title;
        $('#note-text').value = note.text;
        $('#save-note').textContent = 'Save note';
        $('#note-status').textContent = '';
        setNoteHeading('Editing note');
        showNotes();
        $('#note-title').focus();
      };
      row.querySelector('.delete-note').onclick = () => attempt(() => {
        if (!confirm(`Delete “${note.title}”?`)) return;
        change(next => { next.notes = next.notes.filter(item => item.id !== note.id); });
        if (selectedNote === note.id) clearEditor();
        else showNotes();
      });
      $('#note-list').append(row);
    }
    $('#notes-empty').hidden = data.notes.length > 0;
  }
  if ($('#note-form')) $('#note-form').noValidate = true;
  $('#note-form').oninput = () => {
    dirty = true;
    $('#note-status').textContent = 'Unsaved changes';
  };
  $('#note-form').onsubmit = event => {
    event.preventDefault();
    attempt(() => {
      const note = { id: selectedNote || crypto.randomUUID(), title: $('#note-title').value.trim(), text: $('#note-text').value };
      if (!note.title) throw new Error('Give your note a title.');
      change(next => {
        const index = next.notes.findIndex(item => item.id === note.id);
        if (index < 0) {
          next.notes.push(note);
        } else {
          next.notes[index] = note;
        }
      });
      selectedNote = note.id;
      dirty = false;
      $('#save-note').textContent = 'Save note';
      $('#note-status').textContent = 'Saved';
      setNoteHeading('Editing note');
      showNotes();
    });
  };
  $('#new-note').onclick = () => { if (leaveNote()) clearEditor(); };
  window.addEventListener('beforeunload', event => {
    if (dirty) { event.preventDefault(); event.returnValue = ''; }
  });

  // 5. Countdown, daily focus bar chart, and full-window Zen mode.
  const sessionsKey = 'focuslearn-sessions-v1';
  let focusSessions = [];
  let sessionsBlocked = false;

  function todayDateKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function currentTimeLabel() {
    return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  }
  try {
    const savedSessions = localStorage.getItem(sessionsKey);
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      if (!Array.isArray(parsed) || !parsed.every(item => item &&
          typeof item.id === 'string' && typeof item.date === 'string' &&
          typeof item.time === 'string' && typeof item.taskTitle === 'string' &&
          Number.isInteger(item.minutes) && item.minutes >= 1 && item.minutes <= 180 && item.completed === true)) {
        throw new Error('Invalid focus history');
      }
      focusSessions = parsed;
    }
  } catch {
    sessionsBlocked = true;
    focusFeedback('Không đọc được lịch sử Focus. Dữ liệu cũ được giữ nguyên.');
  }

  function saveSessions(nextSessions) {
    if (sessionsBlocked) throw new Error('Không đọc được lịch sử Focus. Dùng Reset examples để đặt lại.');
    try { localStorage.setItem(sessionsKey, JSON.stringify(nextSessions)); }
    catch { throw new Error('Không lưu được lịch sử Focus. Kiểm tra bộ nhớ trình duyệt.'); }
    focusSessions = nextSessions;
  }

  // Thông báo khi hết giờ tập trung; trả về true khi đã phát thông báo hết giờ.
  function notifyTimerDone(taskTitle, minutes) {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('FocusLearn — Time is up!', {
          body: `Đã hoàn thành ${minutes} phút focus (${taskTitle}). Nghỉ ngơi một chút nhé!`,
        });
      }
      if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    } catch { /* ignore notification errors */ }
    return true;
  }

  function showFocusStats() {
    const chartEl = $('#focus-chart');
    const totalEl = $('#focus-stats-total');
    const summaryEl = $('#focus-task-summary');
    if (!chartEl || !totalEl || !summaryEl) return;

    const today = todayDateKey();
    const todaySessions = focusSessions.filter(
      item => item && item.completed === true && item.date === today && Number(item.minutes) > 0
    );
    const totalMinutes = todaySessions.reduce((sum, item) => sum + Number(item.minutes), 0);
    chartEl.setAttribute('aria-label', `Hôm nay: ${totalMinutes} phút, ${todaySessions.length} phiên Focus hoàn thành`);
    totalEl.textContent = `Tổng hôm nay: ${totalMinutes} phút (${todaySessions.length} lần focus)`;

    // Gom nhóm tổng số phút theo từng Task đã hoàn thành trong ngày.
    const byTask = new Map();
    for (const item of todaySessions) {
      const name = item.taskTitle || 'Focus without a task';
      byTask.set(name, (byTask.get(name) || 0) + Number(item.minutes));
    }
    summaryEl.replaceChildren();
    for (const [taskName, mins] of byTask.entries()) {
      const pill = document.createElement('span');
      pill.className = 'focus-task-pill';
      const label = document.createElement('span');
      label.textContent = `${taskName}:`;
      const strong = document.createElement('strong');
      strong.textContent = `${mins} phút`;
      pill.append(label, strong);
      summaryEl.append(pill);
    }

    // Vẽ biểu đồ cột chỉ cho những lần đã chạy hết giờ và có thông báo hết giờ.
    chartEl.replaceChildren();
    if (todaySessions.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.className = 'focus-chart-empty';
      emptyMsg.textContent = 'Chưa có lần focus nào hoàn thành hôm nay. Khi đồng hồ chạy hết giờ và báo "Time is up", phiên focus mới được tính và lưu vào biểu đồ.';
      chartEl.append(emptyMsg);
      return;
    }

    const maxMinutes = Math.max(30, ...todaySessions.map(item => Number(item.minutes)));
    for (const session of todaySessions) {
      const item = document.createElement('div');
      item.className = 'focus-bar-item';

      const track = document.createElement('div');
      track.className = 'focus-bar-track';

      const value = document.createElement('span');
      value.className = 'focus-bar-value';
      value.textContent = `${session.minutes}p`;

      const fill = document.createElement('div');
      fill.className = 'focus-bar-fill';
      const heightPct = Math.max(12, Math.round((Number(session.minutes) / maxMinutes) * 100));
      fill.style.height = `${heightPct}%`;
      fill.title = `${session.time} — ${session.taskTitle}: ${session.minutes} phút`;

      track.append(value, fill);

      const time = document.createElement('span');
      time.className = 'focus-bar-time';
      time.textContent = session.time;

      const task = document.createElement('span');
      task.className = 'focus-bar-task';
      task.textContent = session.taskTitle || 'Focus without a task';

      item.append(track, time, task);
      chartEl.append(item);
    }
  }

  function showTimer() {
    const seconds = remainingSeconds(data.timer);
    const justFinished = seconds === 0 && data.timer.runningSince !== null;

    const running = data.timer.runningSince !== null && seconds > 0;
    const sessionActive = data.timer.runningSince !== null || data.timer.elapsed > 0;
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secondsLeft = String(seconds % 60).padStart(2, '0');
    $('#timer').textContent = `${minutes}:${secondsLeft}`;

    let buttonText = 'Start timer';
    if (running) buttonText = 'Pause timer';
    else if (data.timer.elapsed && seconds > 0) buttonText = 'Resume timer';
    $('#start-timer').textContent = buttonText;
    const wasStartFocused = zenActive && document.activeElement === $('#start-timer');
    $('#start-timer').disabled = seconds === 0;
    $('#reset-timer').textContent = seconds === 0 ? 'Start again' : 'Reset timer';
    if (wasStartFocused && seconds === 0) $('#reset-timer').focus();
    $('#minutes').disabled = sessionActive;
    if ($('#focus-task')) $('#focus-task').disabled = sessionActive;

    let status = 'Choose a few minutes for one task.';
    if (seconds === 0) status = 'Time is up. Take a short break.';
    else if (running) status = 'Focus on one task.';
    else if (data.timer.elapsed) status = 'Paused.';
    if ($('#timer-status').textContent !== status) {
      $('#timer-status').textContent = status;
    }

    // Chỉ khi đồng hồ vừa chạy hết giờ (chạm 0) và đã hiện thông báo hết giờ thì mới lưu & tính vào biểu đồ.
    if (justFinished) {
      // A stable ID prevents counting again after reload; saved metadata keeps the task title.
      const completedSession = {
        ...(data.focusSession || {
          id: `timer-${data.timer.runningSince}-${data.timer.duration}`,
          date: todayDateKey(), time: currentTimeLabel(),
          taskTitle: 'Focus without a task', minutes: Math.round(data.timer.duration / 60),
        }),
        completed: true,
      };
      if (!focusSessions.some(item => item.id === completedSession.id)) {
        try {
          saveSessions([...focusSessions, completedSession]);
          notifyTimerDone(completedSession.taskTitle, completedSession.minutes);
          showFocusStats();
        } catch (error) { focusFeedback(error.message); }
      }
    }
  }
  if ($('#timer-form')) $('#timer-form').noValidate = true;
  $('#timer-form').onsubmit = event => {
    event.preventDefault();
    attempt(() => {
      change(next => {
        const timer = next.timer;
        if (timer.runningSince !== null) {
          timer.elapsed = Math.min(timer.duration, timer.elapsed + Math.max(0, (Date.now() - timer.runningSince) / 1000));
          timer.runningSince = null;
        } else {
          if (timer.elapsed === 0) {
            const rawMinutes = $('#minutes').value.trim();
            const minutes = Number(rawMinutes);
            if (!rawMinutes || !Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
              throw new Error('Choose a whole number of minutes from 1 to 180.');
            }
            timer.duration = minutes * 60;
            const currentTask = data.tasks.find(t => !t.done && t.id === selectedFocusTaskId);
            // Save session metadata with the timer; only completed sessions appear in the chart.
            next.focusSession = {
              taskId: selectedFocusTaskId,
              id: crypto.randomUUID(),
              date: todayDateKey(),
              time: currentTimeLabel(),
              taskTitle: currentTask ? currentTask.title : 'Focus without a task',
              minutes,
              completed: false,
            };
          }
          timer.runningSince = Date.now();
        }
      });
      showTimer();
      showFocusTasks();
    }, true);
  };
  $('#reset-timer').onclick = () => attempt(() => {
    // Nếu Reset trước khi hết giờ thì hủy phiên đang chạy, không lưu vào biểu đồ.
    change(next => { next.timer = { duration: data.timer.duration, elapsed: 0, runningSince: null }; delete next.focusSession; });
    $('#minutes').value = data.timer.duration / 60;
    showTimer();
    showFocusTasks();
    showFocusStats();
  }, true);

  function enterZen() {
    if (zenActive) return;
    const main = $('#main');
    const focusSection = $('#focus');
    if (!main || !focusSection) return;

    focusSection.append($('#zen-chat'));
    savedScroll = { x: window.scrollX, y: window.scrollY };
    savedBodyOverflow = document.body.style.overflow;
    savedFocusAttrs = {
      role: focusSection.getAttribute('role'),
      ariaModal: focusSection.getAttribute('aria-modal'),
      ariaLabelledby: focusSection.getAttribute('aria-labelledby'),
    };

    savedBackground = [];
    for (const child of document.body.children) {
      if (child !== main) {
        savedBackground.push({ el: child, inert: Boolean(child.inert) });
        child.inert = true;
      }
    }
    for (const child of main.children) {
      if (child !== focusSection) {
        savedBackground.push({ el: child, inert: Boolean(child.inert) });
        child.inert = true;
      }
    }

    focusSection.setAttribute('role', 'dialog');
    focusSection.setAttribute('aria-modal', 'true');
    focusSection.setAttribute('aria-labelledby', 'focus-title');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('zen-active');
    zenActive = true;

    if ($('#feedback').textContent && !$('#focus-feedback')?.textContent) {
      focusFeedback($('#feedback').textContent);
    }
    $('#exit-zen')?.focus();
  }

  function exitZen() {
    if (!zenActive) return;
    zenActive = false;

    const focusSection = $('#focus');
    $('#desk-left').append($('#zen-chat'));
    document.body.classList.remove('zen-active');
    document.body.style.overflow = savedBodyOverflow;

    if (focusSection) {
      if (savedFocusAttrs.role === null) focusSection.removeAttribute('role');
      else focusSection.setAttribute('role', savedFocusAttrs.role);
      if (savedFocusAttrs.ariaModal === null) focusSection.removeAttribute('aria-modal');
      else focusSection.setAttribute('aria-modal', savedFocusAttrs.ariaModal);
      if (savedFocusAttrs.ariaLabelledby === null) focusSection.removeAttribute('aria-labelledby');
      else focusSection.setAttribute('aria-labelledby', savedFocusAttrs.ariaLabelledby);
    }

    for (const item of savedBackground) {
      item.el.inert = item.inert;
    }
    savedBackground = [];

    $('#enter-zen')?.focus({ preventScroll: true });
    window.scrollTo({ left: savedScroll.x, top: savedScroll.y, behavior: 'instant' });
  }

  if ($('#enter-zen')) $('#enter-zen').onclick = enterZen;
  if ($('#exit-zen')) $('#exit-zen').onclick = exitZen;

  document.addEventListener('keydown', event => {
    if (!zenActive) return;
    if (event.key === 'Escape' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      exitZen();
      return;
    }
    if (event.key === 'Tab') {
      const focusSection = $('#focus');
      if (!focusSection) return;
      const controls = Array.from(
        focusSection.querySelectorAll('summary, button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.disabled && !el.hidden && (!el.closest('details:not([open])') || el.tagName === 'SUMMARY') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden');

      if (controls.length === 0) {
        event.preventDefault();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !controls.includes(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !controls.includes(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  });

  let statsDate = todayDateKey();
  setInterval(() => {
    showTimer();
    if (statsDate !== todayDateKey()) { statsDate = todayDateKey(); showFocusStats(); }
  }, 1000);

  // Chat AI: a small Gemini REST request. The deployment supplies the key.
  const chatStorageKey = 'focuslearn-chat-v1';
  let chatHistory = [];
  try {
    const saved = JSON.parse(localStorage.getItem(chatStorageKey) || '[]');
    if (Array.isArray(saved)) chatHistory = saved.filter(message =>
      (message?.role === 'user' || message?.role === 'model') &&
      typeof message.parts?.[0]?.text === 'string'
    ).slice(-100);
  } catch (_) { /* Keep chat usable if browser storage is unavailable. */ }
  function saveChat() {
    try { localStorage.setItem(chatStorageKey, JSON.stringify(chatHistory)); }
    catch (_) { chatStatus.textContent = 'Không lưu được lịch sử chat trên trình duyệt này.'; }
  }
  let chatBusy = false;
  const chatStatus = $('#chat-status');
  const chatInput = $('#chat-message');
  function addChatMessage(who, text) {
    const message = document.createElement('p');
    const label = document.createElement('strong');
    label.textContent = who + ': ';
    message.append(label, document.createTextNode(text));
    $('#chat-messages').append(message);
    $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
  }
  for (const message of chatHistory) addChatMessage(message.role === 'user' ? 'Bạn' : 'AI', message.parts[0].text);
  $('#chat-form').onsubmit = async event => {
    event.preventDefault();
    const text = chatInput.value.trim();
    if (!text || chatBusy) return;
    const key = window.FOCUSLEARN_AI?.apiKey;
    if (!key) { chatStatus.textContent = 'Chat chưa được cấu hình. Thêm GEMINI_API_KEY vào GitHub Secrets rồi deploy lại.'; return; }
    chatBusy = true;
    $('#chat-send').disabled = true;
    $('#chat-clear').disabled = true;
    chatInput.disabled = true;
    chatStatus.textContent = 'Đang trả lời…';
    addChatMessage('Bạn', text);
    const userMessage = { role: 'user', parts: [{ text }] };
    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: 'Bạn là trợ lý học tập. Trả lời ngắn gọn, rõ ràng bằng ngôn ngữ của người dùng. Dùng văn bản thuần.' }] },
          contents: [...chatHistory.slice(-10), userMessage],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        if (response.status === 429) throw new Error('AI đang quá tải hoặc hết lượt. Thử lại sau.');
        if (response.status === 400 || response.status === 401 || response.status === 403) throw new Error('Không kết nối được AI. Kiểm tra API key và quyền truy cập.');
        throw new Error('Dịch vụ AI gặp lỗi. Thử lại sau.');
      }
      const result = await response.json();
      const answer = result.candidates?.[0]?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('').trim();
      if (!answer) throw new Error('AI chưa trả lời được câu này. Hãy đổi cách hỏi.');
      chatHistory.push(userMessage, { role: 'model', parts: [{ text: answer }] });
      if (chatHistory.length > 100) chatHistory.splice(0, chatHistory.length - 100);
      addChatMessage('AI', answer);
      chatInput.value = '';
      chatStatus.textContent = '';
      saveChat();
    } catch (error) {
      chatStatus.textContent = error.name === 'TimeoutError' ? 'AI trả lời quá lâu. Bạn thử gửi lại nhé.' :
        error instanceof TypeError ? 'Không kết nối được AI. Kiểm tra mạng rồi thử lại.' : error.message;
    } finally {
      chatBusy = false;
      $('#chat-send').disabled = false;
      $('#chat-clear').disabled = false;
      chatInput.disabled = false;
      if (zenActive && $('#zen-chat').open) chatInput.focus();
    }
  };
  $('#chat-clear').onclick = () => {
    chatHistory.length = 0;
    $('#chat-messages').replaceChildren();
    chatStatus.textContent = '';
    saveChat();
    chatInput.value = '';
  };

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
    sessionsBlocked = false;
    saveSessions([]);
    selectedFocusTaskId = '';
    clearEditor();
    $('#minutes').value = 25;
    showTasks();
    showFocusTasks();
    showNotes();
    showTimer();
    showFocusStats();
    showTheme();
    feedback('Examples restored.');
  });
  $('#date').textContent = new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }).format(new Date());
  $('#minutes').value = data.timer.duration / 60;
  setNoteHeading('New note');
  showTasks();
  showFocusTasks();
  showNotes();
  showTimer();
  showFocusStats();
  showTheme();
  $('#loading').hidden = true;
}

// Start after the HTML has loaded.
startApp();
