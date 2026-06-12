/* ⚡ Тандем — клиент */
'use strict';

/* ---------- helpers ---------- */
const $ = (s, root = document) => root.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function api(path, opts = {}) {
  const o = { headers: {}, ...opts };
  if (o.body && !(o.body instanceof FormData)) {
    o.headers['Content-Type'] = 'application/json';
    o.body = JSON.stringify(o.body);
  }
  const r = await fetch(path, o);
  let j = null;
  try { j = await r.json(); } catch {}
  if (!r.ok) {
    if (r.status === 401 && state.booted) location.reload();
    throw new Error((j && j.error) || 'Ошибка сети');
  }
  return j;
}

const todayLocal = () => new Date().toLocaleDateString('en-CA');
const addDays = (ds, n) => { const d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toLocaleDateString('en-CA'); };
const fmtDay = (ds) => new Date(ds + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
const fmtTime = (ms) => new Date(ms).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const shortDate = (ds) => ds.slice(8, 10) + '.' + ds.slice(5, 7);

/* ---------- state ---------- */
const state = {
  booted: false,
  me: null, users: [], online: [], ai: false,
  tab: 'today',
  dayUser: null, dayDate: todayLocal(), day: null,
  tasks: null,
  stats: null,
  achs: null, achFilter: 'all',
  chat: { msgs: [], loadedAll: false, lastRead: Number(localStorage.getItem('tandem_lastread') || 0), unread: 0 },
};

const userById = (id) => state.users.find((u) => u.id === id);
const userName = (id) => (userById(id) ? userById(id).name : '—');
const COLORS = ['#7c5cff', '#00d4ff', '#2ee6a8', '#ffb454', '#ff5d7a', '#c8f55c'];
const userColor = (id) => COLORS[Math.max(0, state.users.findIndex((u) => u.id === id)) % COLORS.length];

/* ---------- toasts ---------- */
function toast(text, cls = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.textContent = text;
  $('#toastRoot').append(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 350); }, 3500);
}

/* ---------- photo viewer ---------- */
$('#photoViewer').addEventListener('click', () => { $('#photoViewer').hidden = true; });
function viewPhoto(src) { $('#photoViewer img').src = src; $('#photoViewer').hidden = false; }
document.addEventListener('click', (e) => {
  const img = e.target.closest('img[data-view]');
  if (img) viewPhoto(img.src);
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#photoViewer').hidden) { $('#photoViewer').hidden = true; return; }
  const ov = document.querySelector('#modalRoot .overlay');
  if (ov) ov.remove();
});

/* ---------- сжатие фото перед отправкой ---------- */
async function shrink(file) {
  if (!file || !file.type.startsWith('image/')) return file;
  try {
    const img = await createImageBitmap(file);
    const max = 1400;
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s);
    c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
    return blob ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
  } catch { return file; }
}

/* ---------- модалки ---------- */
function openSheet(html) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="sheet">${html}</div>`;
  const close = () => ov.remove();
  ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
  $('#modalRoot').append(ov);
  return { el: ov.firstElementChild, close };
}

function photoPicker(container, hint) {
  let file = null;
  const box = document.createElement('div');
  box.className = 'photo-pick';
  box.innerHTML = `📷 ${esc(hint)}`;
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.hidden = true;
  box.addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    if (!input.files[0]) return;
    box.innerHTML = '⏳ обрабатываю фото…';
    file = await shrink(input.files[0]);
    box.innerHTML = '';
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    box.append(img);
  });
  container.append(box, input);
  return () => file;
}

/* ====================================================================
   АВТОРИЗАЦИЯ
==================================================================== */
const EMOJIS = ['🗿', '🦁', '🐺', '🦅', '🐉', '🔥', '⚡', '🚀', '🎯', '🧠', '🏆'];
let pickedEmoji = EMOJIS[0];

async function initAuth() {
  const cfg = await api('/api/config').catch(() => ({ regOpen: true, needInvite: false }));

  const row = $('#emojiRow');
  EMOJIS.forEach((e, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = e;
    if (i === 0) b.classList.add('sel');
    b.addEventListener('click', () => {
      row.querySelectorAll('button').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      pickedEmoji = e;
    });
    row.append(b);
  });

  if (cfg.needInvite) $('#registerForm [name=invite]').hidden = false;
  if (!cfg.regOpen) { $('#tabRegister').disabled = true; $('#regClosed').hidden = false; }

  $('#tabLogin').addEventListener('click', () => switchAuthTab(true));
  $('#tabRegister').addEventListener('click', () => { if (!$('#tabRegister').disabled) switchAuthTab(false); });
  function switchAuthTab(login) {
    $('#tabLogin').classList.toggle('active', login);
    $('#tabRegister').classList.toggle('active', !login);
    $('#loginForm').hidden = !login;
    $('#registerForm').hidden = login;
    $('#authError').textContent = '';
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/api/login', { method: 'POST', body: { username: f.get('username'), password: f.get('password') } });
      await boot();
    } catch (err) { $('#authError').textContent = err.message; }
  });

  $('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/api/register', {
        method: 'POST',
        body: { name: f.get('name'), username: f.get('username'), password: f.get('password'), emoji: pickedEmoji, invite: f.get('invite') },
      });
      await boot();
    } catch (err) { $('#authError').textContent = err.message; }
  });

  $('#authScreen').hidden = false;
}

/* ====================================================================
   ЗАПУСК
==================================================================== */
async function boot() {
  const me = await api('/api/me');
  Object.assign(state, { me: me.me, users: me.users, online: me.online, ai: me.ai, booted: true });
  state.dayUser = state.me.id;
  state.dayDate = todayLocal();

  $('#authScreen').hidden = true;
  $('#app').hidden = false;
  renderHeader();
  connectSocket();
  setTab('today');
  preloadChatBadge();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

let refreshMeTimer = 0;
function refreshMe() {
  if (Date.now() - refreshMeTimer < 2000) return;
  refreshMeTimer = Date.now();
  api('/api/me').then((me) => {
    Object.assign(state, { me: me.me, users: me.users, online: me.online });
    renderHeader();
  }).catch(() => {});
}

function renderHeader() {
  $('#scoreChips').innerHTML = state.users.map((u) => `
    <div class="chip" title="${esc(u.name)} — очки за сегодня">
      <span class="dot ${state.online.includes(u.id) ? 'on' : ''}"></span>
      ${esc(u.emoji)} ${esc(u.id === state.me.id ? 'Я' : u.name)} <b>${u.todayPts}⚡</b>
    </div>`).join('');
}

/* ====================================================================
   ВКЛАДКИ
==================================================================== */
function setTab(tab) {
  state.tab = tab;
  document.querySelectorAll('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#fab').style.display = (tab === 'today' || tab === 'tasks' || tab === 'achs') ? 'flex' : 'none';
  if (tab === 'today') loadDay();
  if (tab === 'tasks') loadTasks();
  if (tab === 'achs') loadAchs();
  if (tab === 'chat') openChat();
  if (tab === 'stats') loadStats();
}
document.querySelectorAll('#tabbar button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

$('#fab').addEventListener('click', () => {
  if (state.tab === 'tasks') return taskModal();
  if (state.tab === 'achs') return achModal();
  actionSheet();
});

/* ====================================================================
   СЕГОДНЯ
==================================================================== */
async function loadDay() {
  if (state.tab !== 'today') return;
  try {
    state.day = await api(`/api/day?user=${state.dayUser}&date=${state.dayDate}`);
    renderToday();
  } catch (e) { toast(e.message, 'err'); }
}

function renderToday() {
  const d = state.day;
  if (!d) { $('#main').innerHTML = '<div class="empty">Загрузка…</div>'; return; }
  const isMe = d.user.id === state.me.id;
  const checksMap = new Set(d.checks.map((c) => c.habit_id));
  const report = d.posts.find((p) => p.type === 'report');

  /* — переключатель людей — */
  const userSwitch = `<div class="user-switch">${state.users.map((u) => `
    <button data-uid="${u.id}" class="${u.id === d.user.id ? 'active' : ''}">
      ${esc(u.emoji)} ${esc(u.id === state.me.id ? 'Я' : u.name)}
    </button>`).join('')}</div>`;

  /* — навигация по датам — */
  const dayNav = `
    <div class="day-nav">
      <button class="dn-btn" id="dnPrev">‹</button>
      <div class="dn-date">${fmtDay(d.date)}${d.isToday ? '' : `<small id="dnToday">к сегодня ↦</small>`}</div>
      <button class="dn-btn" id="dnNext" ${d.isToday ? 'disabled style="opacity:.25"' : ''}>›</button>
    </div>`;

  /* — присутствие — */
  let presence;
  if (d.presence) {
    presence = `🌅 В сети с <b>${fmtTime(d.presence.first_at)}</b> · активность до <b>${fmtTime(d.presence.last_at)}</b>`;
  } else {
    presence = d.isToday ? '😴 Сегодня ещё не появлялся(ась) в сети' : '— Не был(а) в сети в этот день';
  }

  /* — сводка — */
  const summary = `
    <div class="card"><div class="day-summary">
      <div class="ds-chip">⚡ ${d.pts}<small>очков за день</small></div>
      <div class="ds-chip">✅ ${d.checks.length}/${d.habits.length}<small>привычки</small></div>
      <div class="ds-chip">🍽 ${d.kcal || 0}<small>ккал</small></div>
      ${d.weight ? `<div class="ds-chip">⚖️ ${d.weight}<small>кг (последний)</small></div>` : ''}
    </div></div>`;

  /* — привычки — */
  const habitsHtml = d.habits.length ? d.habits.map((h) => {
    const on = checksMap.has(h.id);
    const clickable = isMe && d.isToday;
    return `<div class="habit ${on ? 'checked' : ''} ${clickable ? '' : 'readonly'}" data-hid="${clickable ? h.id : ''}">
      <span class="hb-emoji">${esc(h.emoji)}</span>
      <span class="hb-title">${esc(h.title)}</span>
      <span class="hb-pts">+${h.pts}</span>
      <span class="hb-check">✓</span>
    </div>`;
  }).join('') : '<div class="empty">Привычек пока нет</div>';

  const habitsCard = `
    <div class="card">
      <h3>Привычки · ${d.checks.length}/${d.habits.length}${isMe ? '<span class="edit" id="editHabits">⚙️</span>' : ''}</h3>
      ${habitsHtml}
    </div>`;

  /* — задачи дня — */
  const dayTasks = [...d.overdue.map((t) => ({ ...t, _over: true })), ...d.tasks];
  const tasksCard = dayTasks.length ? `
    <div class="card">
      <h3>Задачи${d.isToday ? ' на сегодня' : ''} · ${dayTasks.filter((t) => t.status === 'done').length}/${dayTasks.length}</h3>
      ${dayTasks.map((t) => taskRow(t, isMe)).join('')}
    </div>` : '';

  /* — лента дня — */
  const feed = [];
  if (d.presence) feed.push({ at: d.presence.first_at, icon: '🌅', title: 'Появился(ась) в сети', sub: '' });
  d.checks.forEach((c) => feed.push({ at: c.at, icon: c.emoji, title: c.title, sub: `+${c.pts} очков` }));
  d.doneToday.forEach((t) => feed.push({ at: t.done_at, icon: '🎉', title: `Задача выполнена: ${t.title}`, sub: `+${t.pts} очков` }));
  (d.achEvents || []).forEach((e) => feed.push({ at: e.at, icon: '🏆', title: `Ачивка: ${e.title}`, sub: `+${e.pts} XP` }));
  d.posts.filter((p) => p.type !== 'report').forEach((p) => {
    const map = {
      meal: { icon: '🍽', title: 'Приём пищи', sub: p.kcal ? `~${p.kcal} ккал` : '' },
      weight: { icon: '⚖️', title: `Взвешивание: ${p.weight} кг`, sub: '' },
      work: { icon: '💼', title: 'Работа', sub: '' },
      note: { icon: '📝', title: 'Заметка', sub: '' },
    }[p.type];
    feed.push({ at: p.at, icon: map.icon, title: map.title, sub: map.sub, text: p.text, photo: p.photo, postId: isMe ? p.id : null });
  });
  feed.sort((a, b) => a.at - b.at);

  const feedCard = `
    <div class="card">
      <h3>Лента дня</h3>
      ${feed.length ? feed.map((f) => `
        <div class="feed-item">
          <div class="fi-icon">${esc(f.icon)}</div>
          <div class="fi-body">
            <div class="fi-head">
              <span class="fi-title">${esc(f.title)}${f.sub ? `<span class="fi-badge">${esc(f.sub)}</span>` : ''}</span>
              <span class="fi-time">${fmtTime(f.at)}</span>
            </div>
            ${f.text ? `<div class="fi-text">${esc(f.text)}</div>` : ''}
            ${f.photo ? `<img class="fi-photo" data-view src="/uploads/${esc(f.photo)}" loading="lazy">` : ''}
          </div>
          ${f.postId ? `<button class="fi-del" data-delpost="${f.postId}">✕</button>` : ''}
        </div>`).join('') : '<div class="empty">Пока пусто. Начни день с зарядки 💪</div>'}
    </div>`;

  /* — отчёт — */
  let reportHtml = '';
  if (report) {
    reportHtml = `
      <div class="card report-card">
        <h3>🌙 Отчёт за день${isMe && d.isToday ? '<span class="edit" id="editReport">✏️</span>' : ''}</h3>
        <div class="rep-text">${esc(report.text)}</div>
      </div>`;
  } else if (isMe && d.isToday) {
    reportHtml = `<button class="report-btn" id="writeReport">🌙 Написать отчёт за день · +20 ⚡</button>`;
  }

  $('#main').innerHTML = userSwitch + dayNav + `<div class="presence-line">${presence}</div>` + summary + habitsCard + tasksCard + feedCard + reportHtml;

  /* — обработчики — */
  document.querySelectorAll('.user-switch button').forEach((b) =>
    b.addEventListener('click', () => { state.dayUser = Number(b.dataset.uid); loadDay(); }));
  $('#dnPrev').addEventListener('click', () => { state.dayDate = addDays(d.date, -1); loadDay(); });
  $('#dnNext') && $('#dnNext').addEventListener('click', () => {
    if (d.date < todayLocal()) { state.dayDate = addDays(d.date, 1); loadDay(); }
  });
  $('#dnToday') && $('#dnToday').addEventListener('click', () => { state.dayDate = todayLocal(); loadDay(); });

  document.querySelectorAll('.habit[data-hid]').forEach((el) => {
    if (!el.dataset.hid) return;
    el.addEventListener('click', async () => {
      try {
        const r = await api(`/api/habits/${el.dataset.hid}/toggle`, { method: 'POST' });
        if (r.checked) toast(`+${r.pts} очков ⚡`, 'ok');
        loadDay(); refreshMe();
      } catch (e) { toast(e.message, 'err'); }
    });
  });

  document.querySelectorAll('[data-taskcheck]').forEach((el) =>
    el.addEventListener('click', () => toggleTask(Number(el.dataset.taskcheck), el.dataset.status)));

  document.querySelectorAll('[data-delpost]').forEach((el) =>
    el.addEventListener('click', async () => {
      if (!confirm('Удалить запись?')) return;
      await api(`/api/posts/${el.dataset.delpost}`, { method: 'DELETE' }).catch((e) => toast(e.message, 'err'));
      loadDay(); refreshMe();
    }));

  $('#editHabits') && $('#editHabits').addEventListener('click', habitsModal);
  $('#writeReport') && $('#writeReport').addEventListener('click', () => reportModal(null));
  $('#editReport') && $('#editReport').addEventListener('click', () => reportModal(report));
}

function taskRow(t, canCheck) {
  const mineToCheck = canCheck && t.assignee === state.me.id;
  const from = t.creator !== t.assignee ? `<span class="from">от ${esc(userName(t.creator))} 🎯</span> · ` : '';
  const dateInfo = t._over ? `просрочено (${shortDate(t.date)})` : '';
  const canDel = t.creator === state.me.id && t.status === 'open';
  return `
    <div class="task ${t.status === 'done' ? 'done' : ''} ${t._over ? 'overdue' : ''}">
      <div class="tk-check" ${mineToCheck ? `data-taskcheck="${t.id}" data-status="${t.status}"` : ''}>✓</div>
      <div class="tk-body">
        <div class="tk-title">${esc(t.title)}</div>
        <div class="tk-meta">${from}${esc(t.descr || '')} ${dateInfo}</div>
      </div>
      <span class="tk-pts">+${t.pts}</span>
      ${canDel ? `<button class="tk-del" data-deltask="${t.id}">✕</button>` : ''}
    </div>`;
}

async function toggleTask(id, status) {
  try {
    const next = status === 'done' ? 'open' : 'done';
    const t = await api(`/api/tasks/${id}`, { method: 'PATCH', body: { status: next } });
    if (next === 'done') toast(`🎉 +${t.pts} очков за задачу!`, 'ok');
    if (state.tab === 'today') loadDay();
    if (state.tab === 'tasks') loadTasks();
    refreshMe();
  } catch (e) { toast(e.message, 'err'); }
}

/* ---------- меню «+» ---------- */
function actionSheet() {
  const m = openSheet(`
    <h2>Добавить в мой день</h2>
    <div class="action-sheet">
      <button data-t="meal"><span>🍽</span><div>Приём пищи<small>${state.ai ? 'сфоткай еду — ИИ посчитает калории' : 'фото + калории вручную'}</small></div></button>
      <button data-t="weight"><span>⚖️</span><div>Взвешивание<small>${state.ai ? 'число или фото дисплея весов' : 'текущий вес'}</small></div></button>
      <button data-t="work"><span>💼</span><div>Работа / учёба<small>чем занимался</small></div></button>
      <button data-t="note"><span>📝</span><div>Заметка<small>мысль, событие, что угодно</small></div></button>
    </div>`);
  m.el.querySelectorAll('button[data-t]').forEach((b) =>
    b.addEventListener('click', () => { m.close(); postModal(b.dataset.t); }));
}

function postModal(type) {
  const titles = { meal: '🍽 Приём пищи', weight: '⚖️ Взвешивание', work: '💼 Работа', note: '📝 Заметка' };
  const m = openSheet(`
    <h2>${titles[type]}</h2>
    <div class="form" id="postForm">
      <div id="photoSlot"></div>
      ${type === 'meal' ? `
        <label>Калории${state.ai ? ' (пусто — ИИ оценит по фото)' : ''}</label>
        <input id="pKcal" type="number" inputmode="numeric" placeholder="ккал" min="0">
        <label>Что ел</label>
        <input id="pText" placeholder="например: гречка с курицей">` : ''}
      ${type === 'weight' ? `
        <label>Вес, кг${state.ai ? ' (пусто — ИИ считает с фото весов)' : ''}</label>
        <input id="pWeight" type="number" inputmode="decimal" step="0.1" placeholder="например: 82.4">` : ''}
      ${type === 'work' || type === 'note' ? `
        <label>${type === 'work' ? 'Чем занимался' : 'Текст'}</label>
        <textarea id="pText" rows="4" placeholder="${type === 'work' ? 'верстал лендинг, созвон с заказчиком…' : 'свободная заметка…'}"></textarea>` : ''}
      <button class="btn-primary" id="pSubmit">Сохранить</button>
    </div>`);

  const getPhoto = photoPicker($('#photoSlot', m.el), type === 'meal' ? 'Сфоткать еду' : type === 'weight' ? 'Фото дисплея весов' : 'Прикрепить фото (необязательно)');

  $('#pSubmit', m.el).addEventListener('click', async () => {
    const btn = $('#pSubmit', m.el);
    const photo = getPhoto();
    const fd = new FormData();
    fd.append('type', type);
    const text = $('#pText', m.el)?.value || '';
    if (text) fd.append('text', text);
    const kcal = $('#pKcal', m.el)?.value;
    if (kcal) fd.append('kcal', kcal);
    const weight = $('#pWeight', m.el)?.value;
    if (weight) fd.append('weight', weight);
    if (photo) fd.append('photo', photo);

    btn.disabled = true;
    btn.textContent = state.ai && photo && ((type === 'meal' && !kcal) || (type === 'weight' && !weight)) ? '🤖 ИИ анализирует фото…' : 'Сохраняю…';
    try {
      const r = await api('/api/posts', { method: 'POST', body: fd });
      m.close();
      let msg = `+${r.post.pts} очков ⚡`;
      if (r.ai && type === 'meal') msg += ` · ИИ: ~${r.post.kcal} ккал`;
      if (r.ai && type === 'weight') msg += ` · ИИ считал: ${r.post.weight} кг`;
      toast(msg, 'ok');
      state.dayUser = state.me.id; state.dayDate = todayLocal();
      if (state.tab === 'today') loadDay();
      refreshMe();
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Сохранить';
      toast(e.message, 'err');
    }
  });
}

/* ---------- отчёт ---------- */
function reportModal(existing) {
  const d = state.day;
  const m = openSheet(`
    <h2>🌙 Отчёт за день</h2>
    <div class="day-summary" style="margin-bottom:12px">
      <div class="ds-chip">⚡ ${d.pts}<small>очков</small></div>
      <div class="ds-chip">✅ ${d.checks.length}/${d.habits.length}<small>привычки</small></div>
      <div class="ds-chip">🍽 ${d.kcal || 0}<small>ккал</small></div>
      <div class="ds-chip">🎉 ${d.doneToday.length}<small>задач сделано</small></div>
    </div>
    <div class="form">
      <textarea id="repText" rows="6" placeholder="Как прошёл день? Что получилось, что нет, что завтра…">${esc(existing ? existing.text : '')}</textarea>
      <button class="btn-primary" id="repSubmit">${existing ? 'Обновить отчёт' : 'Сохранить · +20 ⚡'}</button>
    </div>`);
  $('#repSubmit', m.el).addEventListener('click', async () => {
    const text = $('#repText', m.el).value.trim();
    if (!text) return toast('Напиши хотя бы пару слов', 'err');
    const fd = new FormData();
    fd.append('type', 'report');
    fd.append('text', text);
    try {
      const r = await api('/api/posts', { method: 'POST', body: fd });
      m.close();
      toast(existing ? 'Отчёт обновлён' : `Отчёт сохранён · +${r.post.pts} ⚡`, 'ok');
      loadDay(); refreshMe();
    } catch (e) { toast(e.message, 'err'); }
  });
}

/* ---------- управление привычками ---------- */
async function habitsModal() {
  const all = await api('/api/habits');
  const m = openSheet(`
    <h2>⚙️ Мои привычки</h2>
    <div id="hmList">${all.map(hmRow).join('')}</div>
    <div class="form" style="margin-top:14px">
      <label>Новая привычка</label>
      <div class="row">
        <input id="hmEmoji" placeholder="🔥" maxlength="4" style="flex:0 0 64px;text-align:center">
        <input id="hmTitle" placeholder="Название" maxlength="60">
      </div>
      <div class="row">
        <select id="hmPts">${[5, 10, 15, 20, 25].map((p) => `<option ${p === 10 ? 'selected' : ''}>${p}</option>`).join('')}</select>
        <button class="btn-primary" id="hmAdd">Добавить</button>
      </div>
    </div>`);

  function hmRow(h) {
    return `<div class="hm-row" data-id="${h.id}">
      <span>${esc(h.emoji)}</span>
      <span class="hm-title ${h.active ? '' : 'off'}">${esc(h.title)}</span>
      <select data-pts>${[5, 10, 15, 20, 25].map((p) => `<option ${p === h.pts ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <button data-toggle title="${h.active ? 'скрыть' : 'вернуть'}">${h.active ? '🗑' : '↩️'}</button>
    </div>`;
  }

  m.el.querySelectorAll('.hm-row').forEach(wireRow);
  function wireRow(row) {
    const id = row.dataset.id;
    row.querySelector('[data-pts]').addEventListener('change', (e) =>
      api(`/api/habits/${id}`, { method: 'PATCH', body: { pts: Number(e.target.value) } }).catch((err) => toast(err.message, 'err')));
    row.querySelector('[data-toggle]').addEventListener('click', async (e) => {
      const isOff = row.querySelector('.hm-title').classList.contains('off');
      await api(`/api/habits/${id}`, { method: 'PATCH', body: { active: isOff } }).catch((err) => toast(err.message, 'err'));
      row.querySelector('.hm-title').classList.toggle('off', !isOff);
      e.target.textContent = isOff ? '🗑' : '↩️';
      e.target.title = isOff ? 'скрыть' : 'вернуть';
    });
  }

  $('#hmAdd', m.el).addEventListener('click', async () => {
    const title = $('#hmTitle', m.el).value.trim();
    if (!title) return;
    try {
      const h = await api('/api/habits', {
        method: 'POST',
        body: { title, emoji: $('#hmEmoji', m.el).value.trim() || '✅', pts: Number($('#hmPts', m.el).value) },
      });
      const div = document.createElement('div');
      div.innerHTML = hmRow({ ...h, active: 1 });
      $('#hmList', m.el).append(div.firstElementChild);
      wireRow($('#hmList', m.el).lastElementChild);
      $('#hmTitle', m.el).value = ''; $('#hmEmoji', m.el).value = '';
    } catch (e) { toast(e.message, 'err'); }
  });

  // при закрытии — обновить день
  m.el.parentElement.addEventListener('click', (e) => { if (e.target === m.el.parentElement) loadDay(); });
}

/* ====================================================================
   ЗАДАНИЯ
==================================================================== */
async function loadTasks() {
  if (state.tab !== 'tasks') return;
  try {
    state.tasks = await api('/api/tasks');
    renderTasks();
  } catch (e) { toast(e.message, 'err'); }
}

function renderTasks() {
  const t = todayLocal(), tm = addDays(t, 1);
  const { mine, created } = state.tasks;
  const groups = [
    ['🔥 Просрочено', mine.filter((x) => x.status === 'open' && x.date < t).map((x) => ({ ...x, _over: true }))],
    ['Сегодня', mine.filter((x) => x.status === 'open' && x.date === t)],
    ['Завтра', mine.filter((x) => x.status === 'open' && x.date === tm)],
    ['Позже', mine.filter((x) => x.status === 'open' && x.date > tm)],
    ['Выполнено (14 дней)', mine.filter((x) => x.status === 'done').sort((a, b) => b.done_at - a.done_at)],
  ];

  let html = '';
  let any = false;
  for (const [label, items] of groups) {
    if (!items.length) continue;
    any = true;
    html += `<div class="group-label">${label}</div><div class="card">${items.map((x) => taskRow(x, true)).join('')}</div>`;
  }
  if (!any) html += '<div class="empty">Задач нет. Поставь себе или кинь вызов другу — кнопка «+»</div>';

  if (created.length) {
    html += `<div class="group-label">🎯 Я назначил</div><div class="card">${created.map((x) => `
      <div class="task ${x.status === 'done' ? 'done' : ''}">
        <div class="tk-check">✓</div>
        <div class="tk-body">
          <div class="tk-title">${esc(x.title)}</div>
          <div class="tk-meta">для ${esc(userName(x.assignee))} · ${shortDate(x.date)} ${esc(x.descr || '')}</div>
        </div>
        <span class="tk-pts">+${x.pts}</span>
        ${x.status === 'open' ? `<button class="tk-del" data-deltask="${x.id}">✕</button>` : ''}
      </div>`).join('')}</div>`;
  }

  $('#main').innerHTML = html;

  document.querySelectorAll('[data-taskcheck]').forEach((el) =>
    el.addEventListener('click', () => toggleTask(Number(el.dataset.taskcheck), el.dataset.status)));
  document.querySelectorAll('[data-deltask]').forEach((el) =>
    el.addEventListener('click', async () => {
      if (!confirm('Удалить задачу?')) return;
      await api(`/api/tasks/${el.dataset.deltask}`, { method: 'DELETE' }).catch((e) => toast(e.message, 'err'));
      loadTasks();
    }));
}

function taskModal() {
  let assignee = state.me.id;
  let when = 'today';
  const m = openSheet(`
    <h2>📌 Новая задача</h2>
    <div class="form">
      <input id="tkTitle" placeholder="Что нужно сделать" maxlength="120">
      <textarea id="tkDescr" rows="2" placeholder="Детали (необязательно)"></textarea>
      <label>Кому</label>
      <div class="seg" id="tkWho">
        ${state.users.map((u) => `<button data-uid="${u.id}" class="${u.id === state.me.id ? 'active' : ''}">
          ${esc(u.emoji)} ${u.id === state.me.id ? 'Себе (+15)' : esc(u.name) + ' (+25)'}</button>`).join('')}
      </div>
      <label>Когда</label>
      <div class="seg" id="tkWhen">
        <button data-w="today" class="active">Сегодня</button>
        <button data-w="tomorrow">Завтра</button>
        <button data-w="date">Дата…</button>
      </div>
      <input id="tkDate" type="date" hidden min="${todayLocal()}" value="${todayLocal()}">
      <button class="btn-primary" id="tkSubmit">Поставить задачу</button>
    </div>`);

  $('#tkWho', m.el).querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      $('#tkWho', m.el).querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      assignee = Number(b.dataset.uid);
    }));
  $('#tkWhen', m.el).querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      $('#tkWhen', m.el).querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      when = b.dataset.w;
      $('#tkDate', m.el).hidden = when !== 'date';
    }));

  $('#tkSubmit', m.el).addEventListener('click', async () => {
    const title = $('#tkTitle', m.el).value.trim();
    if (!title) return toast('Напиши название задачи', 'err');
    const date = when === 'today' ? todayLocal() : when === 'tomorrow' ? addDays(todayLocal(), 1) : $('#tkDate', m.el).value;
    try {
      await api('/api/tasks', { method: 'POST', body: { title, descr: $('#tkDescr', m.el).value, assignee, date } });
      m.close();
      toast(assignee === state.me.id ? 'Задача поставлена 📌' : `Вызов брошен! ${userName(assignee)} получит уведомление 🎯`, 'ok');
      if (state.tab === 'tasks') loadTasks();
      if (state.tab === 'today') loadDay();
    } catch (e) { toast(e.message, 'err'); }
  });
}

/* ====================================================================
   АЧИВКИ — перенос механик из проекта Achievements (Minecraft advancements)
==================================================================== */
const RARITY = {
  common: { label: 'Обычная', xp: 10, icon: '🪨' },
  uncommon: { label: 'Необычная', xp: 25, icon: '🌿' },
  rare: { label: 'Редкая', xp: 50, icon: '💎' },
  epic: { label: 'Эпическая', xp: 100, icon: '🔥' },
  legendary: { label: 'Легендарная', xp: 250, icon: '👑' },
};
const ACH_EMOJIS = ['🏆', '💪', '🏃', '📚', '🧠', '💼', '🥦', '💧', '😴', '🧹', '💸', '🎯', '⛏', '🗿', '🔥', '🚀'];

function achIconHtml(icon) {
  if (icon && icon.startsWith('px:') && window.MC_ICONS) {
    const i = MC_ICONS[Number(icon.slice(3))];
    if (i) return `<img src="${i.data}" alt="">`;
  }
  return esc(icon || '🏆');
}
const achById = (id) => (state.achs || []).find((a) => a.id === id);
const achDone = (a) => (a.daily ? a.done_date === todayLocal() : !!a.done_at);
function achLocked(a) {
  if (!a.parent_id) return false;
  const p = achById(a.parent_id);
  if (!p) return false;
  return p.daily ? !p.completions : !p.done_at;
}
const achCanAct = (a) => a.owner === null || a.owner === state.me.id;

async function loadAchs() {
  if (state.tab !== 'achs') return;
  try {
    state.achs = (await api('/api/achs')).achs;
    renderAchs();
  } catch (e) { toast(e.message, 'err'); }
}

function renderAchs() {
  const all = state.achs || [];
  const f = state.achFilter;
  const friendChips = state.users.filter((u) => u.id !== state.me.id)
    .map((u) => `<button data-f="u${u.id}" class="${f === 'u' + u.id ? 'active' : ''}">${esc(u.emoji)} ${esc(u.name)}</button>`).join('');
  const soundOn = window.Sound && Sound.isEnabled();

  const list = all.filter((a) => {
    if (f === 'mine') return a.owner === state.me.id;
    if (f === 'shared') return a.owner === null;
    if (f === 'done') return achDone(a) || (a.daily && a.completions > 0);
    if (f.startsWith('u')) return a.owner === Number(f.slice(1));
    return true;
  });
  const active = list.filter((a) => !achDone(a));
  const done = list.filter((a) => achDone(a));

  $('#main').innerHTML = `
    <div class="ach-top">
      <div class="seg" id="achFilters">
        <button data-f="all" class="${f === 'all' ? 'active' : ''}">Все</button>
        <button data-f="mine" class="${f === 'mine' ? 'active' : ''}">Мои</button>
        ${friendChips}
        <button data-f="shared" class="${f === 'shared' ? 'active' : ''}">🤝</button>
        <button data-f="done" class="${f === 'done' ? 'active' : ''}">✔</button>
      </div>
      <button class="btn-ghost" id="achSound" title="Звук ачивок">${soundOn ? '🔊' : '🔇'}</button>
    </div>
    ${all.length === 0 ? '<div class="empty">Ачивок пока нет. Жми «+» и брось вызов 🏆<br><br>🎲 в форме создания подкинет идею из сотни готовых</div>' : ''}
    ${f === 'done' ? '' : active.map(achCard).join('')}
    ${f !== 'done' && done.length ? '<div class="group-label">✔ Полученные</div>' : ''}
    ${done.map(achCard).join('')}
  `;

  $('#achFilters').querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => { state.achFilter = b.dataset.f; renderAchs(); }));
  $('#achSound').addEventListener('click', () => {
    if (window.Sound) Sound.setEnabled(!Sound.isEnabled());
    renderAchs();
  });
  document.querySelectorAll('[data-achprog]').forEach((b) =>
    b.addEventListener('click', () => achProgress(Number(b.dataset.achprog), Number(b.dataset.delta))));
  document.querySelectorAll('[data-achreopen]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Вернуть ачивку в работу? Полученный XP сгорит.')) return;
      await api(`/api/achs/${b.dataset.achreopen}/reopen`, { method: 'POST' }).catch((e) => toast(e.message, 'err'));
      loadAchs(); refreshMe();
    }));
  document.querySelectorAll('[data-achdel]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('Удалить ачивку? XP за неё тоже исчезнет.')) return;
      await api(`/api/achs/${b.dataset.achdel}`, { method: 'DELETE' }).catch((e) => toast(e.message, 'err'));
      loadAchs(); refreshMe();
    }));
}

function achCard(a) {
  const r = RARITY[a.rarity] || RARITY.epic;
  const done = achDone(a);
  const locked = !done && achLocked(a);
  const canAct = achCanAct(a);
  const raceClosed = a.share_mode === 'race' && !!a.done_at;
  const parent = a.parent_id ? achById(a.parent_id) : null;

  let who;
  if (a.share_mode === 'each') who = '🤝 общая · XP каждому';
  else if (a.share_mode === 'race') who = '🏁 гонка · XP первому';
  else who = `👤 ${a.owner === state.me.id ? 'моя' : esc(userName(a.owner))}`;
  if (a.creator !== a.owner) who += ` · от ${esc(userName(a.creator))}`;

  const dailyMark = a.daily ? ` · 🔁 ежедневная${a.completions ? ` ×${a.completions}` : ''}` : '';
  const prog = Math.min(a.progress, a.target);
  const bar = a.target > 1 ? `
    <div class="bar ach-bar"><i style="width:${Math.round(prog / a.target * 100)}%"></i></div>
    <div class="ach-progress-num">${prog}/${a.target}</div>` : '';

  let status = '';
  if (done) {
    status = a.share_mode === 'race'
      ? `🏁 Победил: ${esc(userName(a.winner_id))}`
      : `✔ Получено${a.done_at ? ' · ' + shortDate(new Date(a.done_at).toLocaleDateString('en-CA')) : ''}`;
  } else if (locked) {
    status = `🔒 Сначала: «${esc(parent ? parent.title : '—')}»`;
  }

  const btns = [];
  if (!done && !locked && canAct && !raceClosed) {
    if (a.target > 1 && a.progress > 0) btns.push(`<button class="ach-btn" data-achprog="${a.id}" data-delta="-1">−</button>`);
    btns.push(`<button class="ach-btn go" data-achprog="${a.id}" data-delta="1">${a.target > 1 ? '+1' : '⛏ Сделал'}</button>`);
  }
  if (done && !a.daily && canAct) btns.push(`<button class="ach-btn" data-achreopen="${a.id}" title="Вернуть в работу">↩</button>`);
  if (a.creator === state.me.id) btns.push(`<button class="ach-btn" data-achdel="${a.id}" title="Удалить">✕</button>`);

  return `
    <div class="ach-card r-${esc(a.rarity)} ${done ? 'done' : ''} ${locked ? 'locked' : ''}">
      <div class="ach-slot">${achIconHtml(a.icon)}</div>
      <div class="ach-main">
        <div class="ach-title">${esc(a.title)}</div>
        <div class="ach-rar">${r.icon} ${r.label} · +${a.xp} XP${dailyMark}</div>
        ${a.descr ? `<div class="ach-descr">${esc(a.descr)}</div>` : ''}
        <div class="ach-meta">${who}</div>
        ${bar}
        ${a.reward ? `<div class="ach-reward">🎁 ${esc(a.reward)}</div>` : ''}
        ${status ? `<div class="ach-status">${status}</div>` : ''}
      </div>
      <div class="ach-actions">${btns.join('')}</div>
    </div>`;
}

async function achProgress(id, delta) {
  try {
    const r = await api(`/api/achs/${id}/progress`, { method: 'POST', body: { delta } });
    if (r.completed) {
      if (window.Sound) Sound.play(r.ach.rarity === 'legendary' ? 'legendary' : 'complete');
      toast(`🏆 «${r.ach.title}» · +${r.xp} XP`, 'ok');
    } else if (window.Sound) Sound.play('step');
    loadAchs(); refreshMe();
  } catch (e) {
    if (window.Sound) Sound.play('error');
    toast(e.message, 'err');
  }
}

let IDEAS = null;
async function achModal() {
  let icon = '🏆';
  let rarity = 'epic';
  // философия оригинала: ачивки по умолчанию создаются другу
  let assignee = String((state.users.find((u) => u.id !== state.me.id) || state.me).id);
  const m = openSheet(`
    <h2>🏆 Новая ачивка</h2>
    <div class="form">
      <button class="btn-ghost" id="aDice" type="button">🎲 Случайная идея (из 100)</button>
      <input id="aTitle" placeholder="Название" maxlength="120">
      <textarea id="aDescr" rows="2" placeholder="Описание (необязательно)"></textarea>
      <label>Иконка</label>
      <div class="icon-grid" id="aIcons"></div>
      <label>Редкость</label>
      <div class="seg" id="aRarity">
        ${Object.entries(RARITY).map(([k, v]) => `<button data-r="${k}" class="${k === 'epic' ? 'active' : ''}">${v.icon} ${v.label}</button>`).join('')}
      </div>
      <div class="row">
        <div><label>XP</label><input id="aXp" type="number" inputmode="numeric" min="1" value="100"></div>
        <div><label>Шагов до цели</label><input id="aTarget" type="number" inputmode="numeric" min="1" value="1"></div>
      </div>
      <label class="ach-check"><input type="checkbox" id="aDaily"> 🔁 Ежедневная (сбрасывается каждый день, XP за каждый раз)</label>
      <label>Кому</label>
      <div class="seg" id="aWho">
        ${state.users.map((u) => `<button data-a="${u.id}" class="${String(u.id) === assignee ? 'active' : ''}">${esc(u.emoji)} ${u.id === state.me.id ? 'Себе' : esc(u.name)}</button>`).join('')}
        <button data-a="each">🤝 Каждому</button>
        <button data-a="race">🏁 Гонка</button>
      </div>
      <label>Открывается после (родитель)</label>
      <select id="aParent"><option value="">— сразу доступна —</option>
        ${(state.achs || []).map((x) => `<option value="${x.id}">${esc(x.title)}</option>`).join('')}
      </select>
      <input id="aReward" placeholder="🎁 Награда-приз (необязательно)" maxlength="200">
      <button class="btn-primary" id="aSubmit">Создать ачивку</button>
    </div>`);

  const grid = $('#aIcons', m.el);
  const mkIconBtn = (val, inner) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = inner;
    if (val === icon) b.classList.add('sel');
    b.addEventListener('click', () => {
      grid.querySelectorAll('button').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      icon = val;
    });
    grid.append(b);
  };
  ACH_EMOJIS.forEach((e) => mkIconBtn(e, esc(e)));
  (window.MC_ICONS || []).forEach((ic, i) => mkIconBtn('px:' + i, `<img src="${ic.data}" alt="${esc(ic.name)}" title="${esc(ic.name)}">`));

  $('#aRarity', m.el).querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      $('#aRarity', m.el).querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      rarity = b.dataset.r;
      $('#aXp', m.el).value = RARITY[rarity].xp;
    }));
  $('#aWho', m.el).querySelectorAll('button').forEach((b) =>
    b.addEventListener('click', () => {
      $('#aWho', m.el).querySelectorAll('button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      assignee = b.dataset.a;
    }));

  $('#aDice', m.el).addEventListener('click', async () => {
    if (!IDEAS) IDEAS = await fetch('/ideas.json').then((r) => r.json()).catch(() => []);
    if (!IDEAS.length) return;
    const idea = IDEAS[Math.floor(Math.random() * IDEAS.length)];
    $('#aTitle', m.el).value = idea.title;
    $('#aDescr', m.el).value = idea.description || '';
    $('#aTarget', m.el).value = idea.target || 1;
    $('#aDaily', m.el).checked = !!idea.daily;
    rarity = idea.difficulty in RARITY ? idea.difficulty : 'epic';
    $('#aRarity', m.el).querySelectorAll('button').forEach((x) => x.classList.toggle('active', x.dataset.r === rarity));
    $('#aXp', m.el).value = idea.xp || RARITY[rarity].xp;
    if (window.Sound) Sound.play('click');
  });

  $('#aSubmit', m.el).addEventListener('click', async () => {
    const title = $('#aTitle', m.el).value.trim();
    if (!title) return toast('Напиши название', 'err');
    try {
      await api('/api/achs', {
        method: 'POST',
        body: {
          title, descr: $('#aDescr', m.el).value, icon, rarity,
          xp: Number($('#aXp', m.el).value), target: Number($('#aTarget', m.el).value),
          daily: $('#aDaily', m.el).checked, assignee,
          parent_id: Number($('#aParent', m.el).value) || null,
          reward: $('#aReward', m.el).value,
        },
      });
      m.close();
      if (window.Sound) Sound.play('click');
      toast('Ачивка создана 🏆', 'ok');
      if (state.tab === 'achs') loadAchs();
    } catch (e) { toast(e.message, 'err'); }
  });
}

/* ====================================================================
   ЧАТ
==================================================================== */
async function preloadChatBadge() {
  try {
    const r = await api('/api/chat?limit=60');
    state.chat.msgs = r.messages;
    state.chat.unread = r.messages.filter((m) => m.id > state.chat.lastRead && m.user_id !== state.me.id).length;
    updateChatBadge();
  } catch {}
}

function updateChatBadge() {
  const b = $('#chatBadge');
  b.hidden = !state.chat.unread;
  b.textContent = state.chat.unread > 9 ? '9+' : state.chat.unread;
}

function markChatRead() {
  const last = state.chat.msgs.at(-1);
  if (last) {
    state.chat.lastRead = Math.max(state.chat.lastRead, last.id);
    localStorage.setItem('tandem_lastread', state.chat.lastRead);
  }
  state.chat.unread = 0;
  updateChatBadge();
}

function openChat() {
  $('#main').innerHTML = `
    <div id="chatWrap">
      <div id="chatList"></div>
      <form id="chatForm">
        <button type="button" class="icon-btn" id="chatPhotoBtn">📎</button>
        <input type="text" id="chatInput" placeholder="Сообщение…" autocomplete="off">
        <button type="submit" class="icon-btn send">➤</button>
        <input type="file" id="chatFile" accept="image/*" hidden>
      </form>
    </div>`;

  renderChatList(true);
  markChatRead();
  if (window.innerWidth >= 1024) $('#chatInput').focus();

  const list = $('#chatList');
  list.addEventListener('scroll', async () => {
    if (list.scrollTop < 60 && !state.chat.loadedAll && state.chat.msgs.length) {
      const first = state.chat.msgs[0].id;
      const r = await api(`/api/chat?before=${first}&limit=60`).catch(() => null);
      if (!r) return;
      if (!r.messages.length) { state.chat.loadedAll = true; return; }
      const h = list.scrollHeight;
      state.chat.msgs = [...r.messages, ...state.chat.msgs];
      renderChatList(false);
      list.scrollTop = list.scrollHeight - h;
    }
  });

  $('#chatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    const fd = new FormData();
    fd.append('text', text);
    try {
      const msg = await api('/api/chat', { method: 'POST', body: fd });
      pushChatMsg(msg);
    } catch (err) { toast(err.message, 'err'); input.value = text; }
  });

  $('#chatPhotoBtn').addEventListener('click', () => $('#chatFile').click());
  $('#chatFile').addEventListener('change', async () => {
    const f = $('#chatFile').files[0];
    if (!f) return;
    const fd = new FormData();
    const text = $('#chatInput').value.trim();
    if (text) { fd.append('text', text); $('#chatInput').value = ''; }
    fd.append('photo', await shrink(f));
    try {
      const msg = await api('/api/chat', { method: 'POST', body: fd });
      pushChatMsg(msg);
    } catch (err) { toast(err.message, 'err'); }
    $('#chatFile').value = '';
  });
}

function pushChatMsg(msg) {
  if (state.chat.msgs.some((m) => m.id === msg.id)) return;
  state.chat.msgs.push(msg);
  if (state.tab === 'chat' && $('#chatList')) {
    renderChatList(true);
    markChatRead();
  } else if (msg.user_id !== state.me.id) {
    state.chat.unread++;
    updateChatBadge();
  }
}

function renderChatList(scrollBottom) {
  const list = $('#chatList');
  if (!list) return;
  let html = '';
  let lastDate = '';
  for (const msg of state.chat.msgs) {
    const d = new Date(msg.at).toLocaleDateString('en-CA');
    if (d !== lastDate) {
      lastDate = d;
      html += `<div class="chat-day">${d === todayLocal() ? 'Сегодня' : fmtDay(d)}</div>`;
    }
    const mine = msg.user_id === state.me.id;
    const u = userById(msg.user_id);
    // ВАЖНО: внутри .bubble стоит white-space:pre-wrap — никаких переносов в шаблоне
    const nameHtml = !mine && state.users.length > 2 ? `<div class="m-name">${esc(u ? u.emoji + ' ' + u.name : '')}</div>` : '';
    const photoHtml = msg.photo ? `<img data-view src="/uploads/${esc(msg.photo)}" loading="lazy">` : '';
    html += `<div class="msg ${mine ? 'mine' : ''}"><div class="bubble">${nameHtml}${msg.text ? esc(msg.text) : ''}${photoHtml}<div class="m-time">${fmtTime(msg.at)}</div></div></div>`;
  }
  list.innerHTML = html || '<div class="empty">Напиши первое сообщение 👋</div>';
  if (scrollBottom) list.scrollTop = list.scrollHeight;
}

/* ====================================================================
   ПРОГРЕСС
==================================================================== */
async function loadStats() {
  if (state.tab !== 'stats') return;
  try {
    state.stats = await api('/api/stats?days=14');
    renderStats();
  } catch (e) { toast(e.message, 'err'); }
}

function renderStats() {
  const s = state.stats;
  const maxWeek = Math.max(...s.users.map((u) => u.weekPts));

  const duel = `
    <div class="card">
      <h3>🏟 Дуэль недели</h3>
      <div class="duel">
        ${s.users.map((u) => `
          <div class="duel-col ${u.weekPts === maxWeek && maxWeek > 0 ? 'leader' : ''}">
            ${u.weekPts === maxWeek && maxWeek > 0 ? '<div class="crown">👑</div>' : ''}
            <div class="d-emoji">${esc(u.user.emoji)}</div>
            <div class="d-name">${esc(u.user.id === state.me.id ? 'Я' : u.user.name)}</div>
            <div class="d-week">${u.weekPts}</div>
            <div class="d-sub">за неделю · сегодня +${u.todayPts}</div>
            <div class="d-streak">🔥 ${u.streak} ${plural(u.streak, 'день', 'дня', 'дней')}</div>
          </div>`).join('')}
      </div>
    </div>`;

  const levels = `
    <div class="card">
      <h3>Уровни</h3>
      ${s.users.map((u) => {
        const lv = u.level;
        const pct = lv.next ? Math.min(100, Math.round((u.total - lv.min) / (lv.next - lv.min) * 100)) : 100;
        return `<div class="level-row">
          <span class="lv-emoji">${esc(u.user.emoji)}</span>
          <div class="lv-body">
            <div class="lv-name">${esc(u.user.name)} — ур. ${lv.n} «${lv.title}» <span>${u.total}${lv.next ? ' / ' + lv.next : ''} ⚡</span></div>
            <div class="bar"><i style="width:${pct}%"></i></div>
          </div>
        </div>`;
      }).join('')}
    </div>`;

  const legend = (key) => `<div style="display:flex;gap:14px;margin-bottom:6px;font-size:12px;color:var(--mut)">
    ${s.users.map((u) => `<span><span style="color:${userColor(u.user.id)}">●</span> ${esc(u.user.name)}</span>`).join('')}
  </div>`;

  $('#main').innerHTML = duel + levels + `
    <div class="card"><h3>⚡ Очки по дням</h3>${legend()}<canvas class="chart" id="chPts"></canvas></div>
    <div class="card"><h3>⚖️ Вес</h3>${legend()}<canvas class="chart" id="chWeight"></canvas></div>
    <div class="card"><h3>🍽 Калории по дням</h3>${legend()}<canvas class="chart" id="chKcal"></canvas></div>`;

  drawChart($('#chPts'), s.dates, s.users.map((u) => ({ color: userColor(u.user.id), data: u.daily })), { yMin: 0 });

  const weightSeries = s.users.map((u) => {
    const byDate = {};
    u.weights.forEach((w) => { byDate[w.date] = w.weight; });
    return { color: userColor(u.user.id), data: s.dates.map((d) => byDate[d] ?? null) };
  });
  drawChart($('#chWeight'), s.dates, weightSeries, {});

  drawChart($('#chKcal'), s.dates, s.users.map((u) => ({ color: userColor(u.user.id), data: u.kcal.map((v) => v || null) })), { yMin: 0 });
}

function plural(n, a, b, c) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return a;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return b;
  return c;
}

function drawChart(canvas, labels, series, { yMin = null } = {}) {
  const dpr = devicePixelRatio || 1;
  const W = canvas.clientWidth, H = canvas.clientHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const all = series.flatMap((s) => s.data.filter((v) => v != null));
  if (!all.length) {
    ctx.fillStyle = '#8b96ab'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Пока нет данных', W / 2, H / 2);
    return;
  }
  const padL = 36, padR = 10, padT = 10, padB = 18;
  let mn = yMin != null ? yMin : Math.min(...all);
  let mx = Math.max(...all);
  if (mn === mx) mx = mn + 1;
  const span = mx - mn;
  if (yMin == null) mn -= span * 0.1;
  mx += span * 0.1;

  const x = (i) => padL + (W - padL - padR) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
  const y = (v) => padT + (H - padT - padB) * (1 - (v - mn) / (mx - mn));

  ctx.strokeStyle = '#232c3d'; ctx.fillStyle = '#8b96ab'; ctx.font = '10px sans-serif'; ctx.lineWidth = 1; ctx.textAlign = 'left';
  for (let g = 0; g <= 2; g++) {
    const vv = mn + (mx - mn) * g / 2;
    const yy = y(vv);
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(W - padR, yy); ctx.stroke();
    ctx.fillText(String(Math.round(vv * 10) / 10), 2, yy + 3);
  }
  ctx.fillText(shortDate(labels[0]), padL, H - 4);
  const lastTxt = shortDate(labels.at(-1));
  ctx.fillText(lastTxt, W - padR - ctx.measureText(lastTxt).width, H - 4);

  for (const s of series) {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.beginPath();
    let started = false;
    s.data.forEach((v, i) => {
      if (v == null) return;
      const xx = x(i), yy = y(v);
      if (!started) { ctx.moveTo(xx, yy); started = true; } else ctx.lineTo(xx, yy);
    });
    ctx.stroke();
    s.data.forEach((v, i) => {
      if (v == null) return;
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(x(i), y(v), 2.5, 0, 7); ctx.fill();
    });
  }
}

/* ====================================================================
   SOCKET.IO
==================================================================== */
function connectSocket() {
  if (!window.io) return;
  const socket = io();

  socket.on('online', (ids) => { state.online = ids; renderHeader(); });

  socket.on('chat', (msg) => pushChatMsg(msg));

  socket.on('day-event', (e) => {
    if (e.userId !== state.me.id) {
      toast(`${userName(e.userId)}: ${e.label}`);
    }
    if (e.kind === 'ach' || e.kind === 'ach-new') {
      if (e.kind === 'ach' && e.userId !== state.me.id && window.Sound) Sound.play('step');
      if (state.tab === 'achs') loadAchs();
    }
    if (e.kind === 'task') {
      if (state.tab === 'tasks') loadTasks();
      if (state.tab === 'today' && state.dayDate === e.date) loadDay();
    } else if (state.tab === 'today' && state.dayUser === e.userId && state.dayDate === e.date) {
      loadDay();
    }
    if (state.tab === 'stats') loadStats();
    refreshMe();
  });
}

/* перерисовка графиков при изменении окна (ПК) */
let resizeT = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => { if (state.tab === 'stats' && state.stats) renderStats(); }, 250);
});

/* ====================================================================
   INIT
==================================================================== */
(async () => {
  try {
    await boot();
  } catch {
    initAuth();
  }
})();
