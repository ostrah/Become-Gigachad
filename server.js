/* ⚡ Тандем — сервер. Express + Socket.IO + node:sqlite. */
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

/* ---------- .env ---------- */
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

let DatabaseSync;
try {
  ({ DatabaseSync } = require('node:sqlite'));
} catch {
  console.error('❌ Нужен Node.js 22.13+ (встроенный node:sqlite). Сейчас: ' + process.version);
  process.exit(1);
}

const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');

/* ---------- конфиг ---------- */
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0'; // за reverse-proxy ставь 127.0.0.1
const DATA = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const UPLOADS = path.join(DATA, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });

const MAX_USERS = Number(process.env.MAX_USERS || 4);
const INVITE = process.env.INVITE_CODE || '';
const AI_KEY = process.env.ANTHROPIC_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'claude-opus-4-8';

let anthropic = null;
if (AI_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: AI_KEY });
}

/* ---------- база ---------- */
const db = new DatabaseSync(path.join(DATA, 'tandem.db'));
db.exec(`
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  pass TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '🙂',
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS sessions(
  token TEXT PRIMARY KEY,
  user_id INTEGER,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS presence(
  user_id INTEGER, date TEXT, first_at INTEGER, last_at INTEGER,
  PRIMARY KEY(user_id, date)
);
CREATE TABLE IF NOT EXISTS habits(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, title TEXT, emoji TEXT DEFAULT '✅',
  pts INTEGER DEFAULT 10, active INTEGER DEFAULT 1, sort INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS habit_checks(
  habit_id INTEGER, user_id INTEGER, date TEXT, at INTEGER, pts INTEGER,
  PRIMARY KEY(habit_id, date)
);
CREATE TABLE IF NOT EXISTS posts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, date TEXT, at INTEGER, type TEXT,
  text TEXT, photo TEXT, kcal INTEGER, weight REAL, pts INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS tasks(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator INTEGER, assignee INTEGER, title TEXT, descr TEXT,
  date TEXT, status TEXT DEFAULT 'open',
  created_at INTEGER, done_at INTEGER, done_date TEXT, pts INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS messages(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER, text TEXT, photo TEXT, at INTEGER
);
CREATE TABLE IF NOT EXISTS achs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator INTEGER, owner INTEGER,
  share_mode TEXT,
  title TEXT NOT NULL, descr TEXT, icon TEXT DEFAULT '🏆',
  rarity TEXT DEFAULT 'epic', xp INTEGER DEFAULT 100,
  target INTEGER DEFAULT 1, daily INTEGER DEFAULT 0,
  parent_id INTEGER, reward TEXT,
  progress INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  last_date TEXT, done_date TEXT, done_at INTEGER,
  winner_id INTEGER,
  created_at INTEGER
);
CREATE TABLE IF NOT EXISTS ach_events(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ach_id INTEGER, user_id INTEGER,
  date TEXT, at INTEGER, pts INTEGER,
  title TEXT, icon TEXT, rarity TEXT
);
`);

const q = {
  get: (sql, ...p) => db.prepare(sql).get(...p),
  all: (sql, ...p) => db.prepare(sql).all(...p),
  run: (sql, ...p) => db.prepare(sql).run(...p),
};

/* ---------- утилиты ---------- */
const now = () => Date.now();
const todayStr = () => new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD в локальном TZ
const hhmm = (t) => new Date(t).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
const publicUser = (u) => ({ id: u.id, username: u.username, name: u.name, emoji: u.emoji });

const POST_PTS = { meal: 5, weight: 5, work: 10, note: 2, report: 20 };
/* редкости ачивок → XP по умолчанию (как в исходном проекте Achievements) */
const ACH_RARITY = { common: 10, uncommon: 25, rare: 50, epic: 100, legendary: 250 };
const DEFAULT_HABITS = [
  ['Чистка зубов', '🦷', 5],
  ['Зарядка', '🤸', 15],
  ['Отжимания', '💪', 15],
  ['Чтение 20 минут', '📚', 15],
  ['Прогулка', '🚶', 10],
  ['Лёг спать до 23:30', '😴', 15],
];
const LEVELS = [
  [0, 'НПС'], [150, 'Дрищ'], [400, 'Новичок'], [800, 'Качок'],
  [1400, 'Атлет'], [2200, 'Машина'], [3200, 'Альфа'], [4500, 'Терминатор'], [6000, 'ГИГАЧАД'],
];

function levelOf(total) {
  let i = 0;
  while (i + 1 < LEVELS.length && total >= LEVELS[i + 1][0]) i++;
  return {
    n: i + 1, title: LEVELS[i][1], min: LEVELS[i][0],
    next: i + 1 < LEVELS.length ? LEVELS[i + 1][0] : null,
  };
}

function dayPts(uid, d) {
  const a = q.get('SELECT COALESCE(SUM(pts),0) s FROM habit_checks WHERE user_id=? AND date=?', uid, d).s;
  const b = q.get('SELECT COALESCE(SUM(pts),0) s FROM posts WHERE user_id=? AND date=?', uid, d).s;
  const c = q.get(`SELECT COALESCE(SUM(pts),0) s FROM tasks WHERE assignee=? AND status='done' AND done_date=?`, uid, d).s;
  const e = q.get('SELECT COALESCE(SUM(pts),0) s FROM ach_events WHERE user_id=? AND date=?', uid, d).s;
  return a + b + c + e;
}

/* ---------- приложение ---------- */
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json({ limit: '200kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: UPLOADS,
  filename: (req, file, cb) => {
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/heic': '.heic' }[file.mimetype] || '.jpg';
    cb(null, crypto.randomUUID() + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

/* ---------- auth ---------- */
function parseCookies(header) {
  const out = {};
  for (const part of (header || '').split(/; */)) {
    if (!part) continue;
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i)] = decodeURIComponent(part.slice(i + 1));
  }
  return out;
}

function getUser(req) {
  const tk = parseCookies(req.headers.cookie).tk;
  if (!tk) return null;
  return q.get('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?', tk) || null;
}

function startSession(res, uid) {
  const token = crypto.randomBytes(24).toString('base64url');
  q.run('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)', token, uid, now());
  res.setHeader('Set-Cookie', `tk=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=15552000`);
}

function emitDay(userId, date, kind, label, extra) {
  io.emit('day-event', { userId, date, kind, label, ...(extra || {}) });
}

function touchPresence(u) {
  const d = todayStr(), t = now();
  const row = q.get('SELECT first_at FROM presence WHERE user_id=? AND date=?', u.id, d);
  if (!row) {
    q.run('INSERT INTO presence(user_id,date,first_at,last_at) VALUES(?,?,?,?)', u.id, d, t, t);
    emitDay(u.id, d, 'presence', `🌅 в сети с ${hhmm(t)}`);
  } else {
    q.run('UPDATE presence SET last_at=? WHERE user_id=? AND date=?', t, u.id, d);
  }
}

function auth(req, res, next) {
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: 'unauthorized' });
  req.user = u;
  touchPresence(u);
  next();
}

const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

/* ---------- ИИ: калории и вес по фото ---------- */
async function aiAnalyze(kind, filePath, mime) {
  if (!anthropic) return null;
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) return null;
  const data = fs.readFileSync(filePath).toString('base64');
  if (data.length > 6_800_000) return null; // лимит API ~5МБ на изображение
  const prompts = {
    meal: 'На фото — еда. Оцени примерную калорийность всей порции на фото (ккал, целое число) и дай короткое название блюда на русском (до 5 слов). Если еды на фото нет или не видно — kcal: 0.',
    weight: 'На фото — дисплей весов. Считай показание веса в килограммах (число). Если показание не читается — weight: 0.',
  };
  const schemas = {
    meal: {
      type: 'object',
      properties: { kcal: { type: 'integer' }, title: { type: 'string' } },
      required: ['kcal', 'title'], additionalProperties: false,
    },
    weight: {
      type: 'object',
      properties: { weight: { type: 'number' } },
      required: ['weight'], additionalProperties: false,
    },
  };
  try {
    const res = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 500,
      output_config: { format: { type: 'json_schema', schema: schemas[kind] } },
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime, data } },
          { type: 'text', text: prompts[kind] },
        ],
      }],
    }, { timeout: 30000, maxRetries: 1 });
    const text = res.content.find((b) => b.type === 'text')?.text;
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error('AI:', e.message);
    return null;
  }
}

/* ---------- публичные руты ---------- */
app.get('/api/config', (req, res) => {
  const count = q.get('SELECT COUNT(*) c FROM users').c;
  res.json({ regOpen: count < MAX_USERS, needInvite: !!INVITE, ai: !!anthropic, users: count });
});

const loginAttempts = new Map();
function rateLimited(ip) {
  const rec = loginAttempts.get(ip) || { n: 0, t: now() };
  if (now() - rec.t > 600000) { rec.n = 0; rec.t = now(); }
  rec.n++;
  loginAttempts.set(ip, rec);
  return rec.n > 25;
}

app.post('/api/register', (req, res) => {
  const { username, password, name, emoji, invite } = req.body || {};
  if (q.get('SELECT COUNT(*) c FROM users').c >= MAX_USERS) return bad(res, 'Регистрация закрыта: достигнут лимит участников');
  if (INVITE && invite !== INVITE) return bad(res, 'Неверный код приглашения');
  if (!/^[a-z0-9_]{3,20}$/i.test(username || '')) return bad(res, 'Логин: 3–20 символов, латиница/цифры/_');
  if (!password || password.length < 4) return bad(res, 'Пароль: минимум 4 символа');
  if (!name || !name.trim() || name.length > 30) return bad(res, 'Укажи имя (до 30 символов)');
  if (q.get('SELECT id FROM users WHERE username=?', username.toLowerCase())) return bad(res, 'Логин уже занят');

  const r = q.run('INSERT INTO users(username,pass,name,emoji,created_at) VALUES(?,?,?,?,?)',
    username.toLowerCase(), bcrypt.hashSync(password, 10), name.trim(), (emoji || '🙂').slice(0, 8), now());
  const uid = Number(r.lastInsertRowid);
  DEFAULT_HABITS.forEach(([t, e, p], i) =>
    q.run('INSERT INTO habits(user_id,title,emoji,pts,sort) VALUES(?,?,?,?,?)', uid, t, e, p, i));
  startSession(res, uid);
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  if (rateLimited(req.socket.remoteAddress || '?')) return bad(res, 'Слишком много попыток, подожди 10 минут', 429);
  const { username, password } = req.body || {};
  const u = q.get('SELECT * FROM users WHERE username=?', (username || '').toLowerCase());
  if (!u || !bcrypt.compareSync(password || '', u.pass)) return bad(res, 'Неверный логин или пароль', 401);
  startSession(res, u.id);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  const tk = parseCookies(req.headers.cookie).tk;
  if (tk) q.run('DELETE FROM sessions WHERE token=?', tk);
  res.setHeader('Set-Cookie', 'tk=; Path=/; HttpOnly; Max-Age=0');
  res.json({ ok: true });
});

/* ---------- защищённые руты ---------- */
app.get('/api/me', auth, (req, res) => {
  const d = todayStr();
  const users = q.all('SELECT * FROM users ORDER BY id').map((u) => ({
    ...publicUser(u),
    lastAt: q.get('SELECT MAX(last_at) m FROM presence WHERE user_id=?', u.id).m || null,
    todayPts: dayPts(u.id, d),
  }));
  res.json({ me: publicUser(req.user), users, online: [...online.keys()], ai: !!anthropic, today: d });
});

app.get('/api/day', auth, (req, res) => {
  const uid = Number(req.query.user || req.user.id);
  const d = isDate(req.query.date) ? req.query.date : todayStr();
  const target = q.get('SELECT * FROM users WHERE id=?', uid);
  if (!target) return bad(res, 'Нет такого пользователя', 404);
  const t = todayStr();

  const habits = q.all('SELECT id,title,emoji,pts FROM habits WHERE user_id=? AND active=1 ORDER BY sort,id', uid);
  const checks = q.all('SELECT hc.habit_id, hc.at, hc.pts, h.title, h.emoji FROM habit_checks hc JOIN habits h ON h.id=hc.habit_id WHERE hc.user_id=? AND hc.date=?', uid, d);
  const posts = q.all('SELECT * FROM posts WHERE user_id=? AND date=? ORDER BY at', uid, d);
  const tasks = q.all('SELECT * FROM tasks WHERE assignee=? AND date=? ORDER BY created_at', uid, d);
  const doneToday = q.all(`SELECT * FROM tasks WHERE assignee=? AND status='done' AND done_date=? ORDER BY done_at`, uid, d);
  const overdue = d === t
    ? q.all(`SELECT * FROM tasks WHERE assignee=? AND status='open' AND date<? ORDER BY date`, uid, d)
    : [];
  const achEvents = q.all('SELECT * FROM ach_events WHERE user_id=? AND date=? ORDER BY at', uid, d);
  const presence = q.get('SELECT first_at,last_at FROM presence WHERE user_id=? AND date=?', uid, d) || null;
  const kcal = q.get(`SELECT COALESCE(SUM(kcal),0) s FROM posts WHERE user_id=? AND date=? AND type='meal'`, uid, d).s;
  const weight = q.get(`SELECT weight FROM posts WHERE user_id=? AND type='weight' AND weight IS NOT NULL AND date<=? ORDER BY at DESC LIMIT 1`, uid, d)?.weight ?? null;

  res.json({
    user: publicUser(target), date: d, isToday: d === t, presence,
    habits, checks, posts, tasks, doneToday, overdue, achEvents,
    pts: dayPts(uid, d), kcal, weight,
  });
});

/* --- привычки --- */
app.get('/api/habits', auth, (req, res) => {
  res.json(q.all('SELECT id,title,emoji,pts,active FROM habits WHERE user_id=? ORDER BY sort,id', req.user.id));
});

app.post('/api/habits', auth, (req, res) => {
  const { title, emoji, pts } = req.body || {};
  if (!title || !title.trim() || title.length > 60) return bad(res, 'Название: до 60 символов');
  const p = [5, 10, 15, 20, 25].includes(Number(pts)) ? Number(pts) : 10;
  const sort = (q.get('SELECT COALESCE(MAX(sort),0) m FROM habits WHERE user_id=?', req.user.id).m) + 1;
  const r = q.run('INSERT INTO habits(user_id,title,emoji,pts,sort) VALUES(?,?,?,?,?)',
    req.user.id, title.trim(), (emoji || '✅').slice(0, 8), p, sort);
  res.json(q.get('SELECT id,title,emoji,pts FROM habits WHERE id=?', Number(r.lastInsertRowid)));
});

app.patch('/api/habits/:id', auth, (req, res) => {
  const h = q.get('SELECT * FROM habits WHERE id=? AND user_id=?', Number(req.params.id), req.user.id);
  if (!h) return bad(res, 'Не найдено', 404);
  const b = req.body || {};
  const title = b.title !== undefined ? String(b.title).trim().slice(0, 60) || h.title : h.title;
  const emoji = b.emoji !== undefined ? String(b.emoji).slice(0, 8) : h.emoji;
  const pts = [5, 10, 15, 20, 25].includes(Number(b.pts)) ? Number(b.pts) : h.pts;
  const active = b.active !== undefined ? (b.active ? 1 : 0) : h.active;
  q.run('UPDATE habits SET title=?,emoji=?,pts=?,active=? WHERE id=?', title, emoji, pts, active, h.id);
  res.json({ ok: true });
});

app.post('/api/habits/:id/toggle', auth, (req, res) => {
  const h = q.get('SELECT * FROM habits WHERE id=? AND user_id=?', Number(req.params.id), req.user.id);
  if (!h) return bad(res, 'Не найдено', 404);
  const d = todayStr(); // отметки — только за сегодня, без задним числом
  const ex = q.get('SELECT habit_id FROM habit_checks WHERE habit_id=? AND date=?', h.id, d);
  if (ex) {
    q.run('DELETE FROM habit_checks WHERE habit_id=? AND date=?', h.id, d);
    emitDay(req.user.id, d, 'habit', `↩️ снял отметку «${h.title}»`);
    return res.json({ checked: false });
  }
  q.run('INSERT INTO habit_checks(habit_id,user_id,date,at,pts) VALUES(?,?,?,?,?)', h.id, req.user.id, d, now(), h.pts);
  emitDay(req.user.id, d, 'habit', `${h.emoji} ${h.title} · +${h.pts}`);
  res.json({ checked: true, pts: h.pts });
});

/* --- посты (еда, вес, работа, заметка, отчёт) --- */
app.post('/api/posts', auth, upload.single('photo'), async (req, res) => {
  const type = (req.body && req.body.type) || '';
  if (!(type in POST_PTS)) return bad(res, 'Неизвестный тип записи');
  const d = todayStr(), t = now();
  let text = String((req.body && req.body.text) || '').trim().slice(0, 4000);
  let kcal = req.body && req.body.kcal !== undefined && req.body.kcal !== '' ? Math.round(Number(req.body.kcal)) : null;
  if (kcal !== null && (!Number.isFinite(kcal) || kcal < 0 || kcal > 20000)) kcal = null;
  let weight = req.body && req.body.weight !== undefined && req.body.weight !== '' ? Number(Number(req.body.weight).toFixed(1)) : null;
  if (weight !== null && (!Number.isFinite(weight) || weight <= 0 || weight > 500)) weight = null;
  const photo = req.file ? req.file.filename : null;
  let aiUsed = false;

  if (photo && anthropic) {
    if (type === 'meal' && kcal === null) {
      const ai = await aiAnalyze('meal', req.file.path, req.file.mimetype);
      if (ai && ai.kcal > 0) { kcal = Math.round(ai.kcal); aiUsed = true; if (!text && ai.title) text = ai.title; }
    } else if (type === 'weight' && weight === null) {
      const ai = await aiAnalyze('weight', req.file.path, req.file.mimetype);
      if (ai && ai.weight > 0 && ai.weight < 500) { weight = Number(ai.weight.toFixed(1)); aiUsed = true; }
    }
  }

  if (type === 'weight' && weight === null) return bad(res, 'Укажи вес числом (или пришли чёткое фото дисплея весов)');
  if ((type === 'work' || type === 'note' || type === 'report') && !text && !photo) return bad(res, 'Добавь текст');

  if (type === 'report') {
    const ex = q.get(`SELECT id FROM posts WHERE user_id=? AND date=? AND type='report'`, req.user.id, d);
    if (ex) {
      q.run('UPDATE posts SET text=?, at=? WHERE id=?', text, t, ex.id);
      const post = q.get('SELECT * FROM posts WHERE id=?', ex.id);
      emitDay(req.user.id, d, 'post', '🌙 обновил отчёт за день');
      return res.json({ post, ai: false });
    }
  }

  const r = q.run('INSERT INTO posts(user_id,date,at,type,text,photo,kcal,weight,pts) VALUES(?,?,?,?,?,?,?,?,?)',
    req.user.id, d, t, type, text || null, photo, kcal, weight, POST_PTS[type]);
  const post = q.get('SELECT * FROM posts WHERE id=?', Number(r.lastInsertRowid));

  const labels = {
    meal: `🍽 приём пищи${kcal ? ` · ~${kcal} ккал` : ''} · +${POST_PTS.meal}`,
    weight: `⚖️ ${weight} кг · +${POST_PTS.weight}`,
    work: `💼 ${text.slice(0, 50) || 'работа'} · +${POST_PTS.work}`,
    note: `📝 заметка · +${POST_PTS.note}`,
    report: `🌙 отчёт за день · +${POST_PTS.report}`,
  };
  emitDay(req.user.id, d, 'post', labels[type]);
  res.json({ post, ai: aiUsed });
});

app.patch('/api/posts/:id', auth, (req, res) => {
  const p = q.get('SELECT * FROM posts WHERE id=? AND user_id=?', Number(req.params.id), req.user.id);
  if (!p) return bad(res, 'Не найдено', 404);
  const b = req.body || {};
  const text = b.text !== undefined ? String(b.text).trim().slice(0, 4000) : p.text;
  let kcal = b.kcal !== undefined ? (b.kcal === null || b.kcal === '' ? null : Math.round(Number(b.kcal))) : p.kcal;
  if (kcal !== null && !Number.isFinite(kcal)) kcal = p.kcal;
  let weight = b.weight !== undefined ? (b.weight === null || b.weight === '' ? null : Number(Number(b.weight).toFixed(1))) : p.weight;
  if (weight !== null && !Number.isFinite(weight)) weight = p.weight;
  q.run('UPDATE posts SET text=?,kcal=?,weight=? WHERE id=?', text, kcal, weight, p.id);
  res.json(q.get('SELECT * FROM posts WHERE id=?', p.id));
});

app.delete('/api/posts/:id', auth, (req, res) => {
  const p = q.get('SELECT * FROM posts WHERE id=? AND user_id=?', Number(req.params.id), req.user.id);
  if (!p) return bad(res, 'Не найдено', 404);
  q.run('DELETE FROM posts WHERE id=?', p.id);
  if (p.photo) fs.promises.unlink(path.join(UPLOADS, p.photo)).catch(() => {});
  emitDay(req.user.id, p.date, 'post', '🗑 запись удалена');
  res.json({ ok: true });
});

/* --- задачи --- */
app.get('/api/tasks', auth, (req, res) => {
  const cutoff = new Date(now() - 14 * 86400000).toLocaleDateString('en-CA');
  const mine = q.all(
    `SELECT * FROM tasks WHERE assignee=? AND (status='open' OR done_date>=?) ORDER BY date, created_at`,
    req.user.id, cutoff);
  const created = q.all(
    `SELECT * FROM tasks WHERE creator=? AND assignee!=? AND (status='open' OR done_date>=?) ORDER BY date, created_at`,
    req.user.id, req.user.id, cutoff);
  res.json({ mine, created });
});

app.post('/api/tasks', auth, (req, res) => {
  const { title, descr, assignee, date } = req.body || {};
  if (!title || !title.trim() || title.length > 120) return bad(res, 'Название задачи: до 120 символов');
  const aid = Number(assignee || req.user.id);
  const target = q.get('SELECT * FROM users WHERE id=?', aid);
  if (!target) return bad(res, 'Нет такого пользователя');
  const d = isDate(date) ? date : todayStr();
  if (d < todayStr()) return bad(res, 'Дата в прошлом');
  const pts = aid === req.user.id ? 15 : 25;
  const r = q.run('INSERT INTO tasks(creator,assignee,title,descr,date,created_at,pts) VALUES(?,?,?,?,?,?,?)',
    req.user.id, aid, title.trim(), String(descr || '').trim().slice(0, 2000) || null, d, now(), pts);
  const task = q.get('SELECT * FROM tasks WHERE id=?', Number(r.lastInsertRowid));
  if (aid !== req.user.id) {
    emitDay(req.user.id, d, 'task', `📌 новая задача для ${target.name}: «${task.title}» (+${pts})`);
  } else {
    emitDay(req.user.id, d, 'task', `📌 поставил себе задачу: «${task.title}»`);
  }
  res.json(task);
});

app.patch('/api/tasks/:id', auth, (req, res) => {
  const task = q.get('SELECT * FROM tasks WHERE id=?', Number(req.params.id));
  if (!task) return bad(res, 'Не найдено', 404);
  const b = req.body || {};

  if (b.status !== undefined) {
    if (task.assignee !== req.user.id) return bad(res, 'Отмечать может только исполнитель', 403);
    if (b.status === 'done' && task.status === 'open') {
      const d = todayStr();
      q.run(`UPDATE tasks SET status='done', done_at=?, done_date=? WHERE id=?`, now(), d, task.id);
      emitDay(req.user.id, d, 'task', `🎉 выполнено: «${task.title}» · +${task.pts}`);
    } else if (b.status === 'open' && task.status === 'done') {
      q.run(`UPDATE tasks SET status='open', done_at=NULL, done_date=NULL WHERE id=?`, task.id);
      emitDay(req.user.id, todayStr(), 'task', `↩️ вернул задачу «${task.title}»`);
    }
    return res.json(q.get('SELECT * FROM tasks WHERE id=?', task.id));
  }

  if (task.creator !== req.user.id) return bad(res, 'Редактировать может только автор', 403);
  if (task.status !== 'open') return bad(res, 'Выполненную задачу нельзя менять');
  const title = b.title !== undefined ? String(b.title).trim().slice(0, 120) || task.title : task.title;
  const descr = b.descr !== undefined ? String(b.descr).trim().slice(0, 2000) || null : task.descr;
  const date = isDate(b.date) ? b.date : task.date;
  q.run('UPDATE tasks SET title=?,descr=?,date=? WHERE id=?', title, descr, date, task.id);
  res.json(q.get('SELECT * FROM tasks WHERE id=?', task.id));
});

app.delete('/api/tasks/:id', auth, (req, res) => {
  const task = q.get('SELECT * FROM tasks WHERE id=?', Number(req.params.id));
  if (!task) return bad(res, 'Не найдено', 404);
  if (task.creator !== req.user.id) return bad(res, 'Удалять может только автор', 403);
  if (task.status !== 'open') return bad(res, 'Выполненную задачу нельзя удалить');
  q.run('DELETE FROM tasks WHERE id=?', task.id);
  emitDay(req.user.id, task.date, 'task', `🗑 задача «${task.title}» удалена`);
  res.json({ ok: true });
});

/* --- ачивки (перенос из проекта Achievements) --- */
function achParentDone(a) {
  if (!a.parent_id) return true;
  const p = q.get('SELECT * FROM achs WHERE id=?', a.parent_id);
  if (!p) return true;
  return p.daily ? p.completions > 0 : !!p.done_at;
}

app.get('/api/achs', auth, (req, res) => {
  res.json({ achs: q.all('SELECT * FROM achs ORDER BY created_at DESC') });
});

app.post('/api/achs', auth, (req, res) => {
  const b = req.body || {};
  const title = String(b.title || '').trim().slice(0, 120);
  if (!title) return bad(res, 'Напиши название ачивки');
  const rarity = (b.rarity in ACH_RARITY) ? b.rarity : 'epic';
  let xp = Math.round(Number(b.xp));
  if (!Number.isFinite(xp) || xp < 1 || xp > 100000) xp = ACH_RARITY[rarity];
  let target = Math.round(Number(b.target));
  if (!Number.isFinite(target) || target < 1 || target > 10000) target = 1;
  let owner = null, share = null;
  if (b.assignee === 'each' || b.assignee === 'race') {
    share = b.assignee;
  } else {
    owner = Number(b.assignee || req.user.id);
    if (!q.get('SELECT id FROM users WHERE id=?', owner)) return bad(res, 'Нет такого пользователя');
  }
  const daily = share === 'race' ? 0 : (b.daily ? 1 : 0); // гонка не бывает ежедневной
  let parentId = Number(b.parent_id) || null;
  if (parentId && !q.get('SELECT id FROM achs WHERE id=?', parentId)) parentId = null;
  const icon = String(b.icon || '🏆').slice(0, 16);
  const r = q.run(
    `INSERT INTO achs(creator,owner,share_mode,title,descr,icon,rarity,xp,target,daily,parent_id,reward,created_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    req.user.id, owner, share, title,
    String(b.descr || '').trim().slice(0, 1000) || null,
    icon, rarity, xp, target, daily, parentId,
    String(b.reward || '').trim().slice(0, 200) || null, now());
  const ach = q.get('SELECT * FROM achs WHERE id=?', Number(r.lastInsertRowid));
  const who = share === 'each' ? '🤝 общая' : share === 'race' ? '🏁 гонка'
    : owner === req.user.id ? 'себе' : `для ${q.get('SELECT name FROM users WHERE id=?', owner).name}`;
  emitDay(req.user.id, todayStr(), 'ach-new', `🏆 новая ачивка ${who}: «${title}» (+${xp} XP)`);
  res.json(ach);
});

app.patch('/api/achs/:id', auth, (req, res) => {
  const a = q.get('SELECT * FROM achs WHERE id=?', Number(req.params.id));
  if (!a) return bad(res, 'Не найдено', 404);
  if (a.creator !== req.user.id) return bad(res, 'Редактировать может только автор', 403);
  const b = req.body || {};
  const title = b.title !== undefined ? String(b.title).trim().slice(0, 120) || a.title : a.title;
  const descr = b.descr !== undefined ? String(b.descr).trim().slice(0, 1000) || null : a.descr;
  const icon = b.icon !== undefined ? String(b.icon).slice(0, 16) || a.icon : a.icon;
  const reward = b.reward !== undefined ? String(b.reward).trim().slice(0, 200) || null : a.reward;
  q.run('UPDATE achs SET title=?,descr=?,icon=?,reward=? WHERE id=?', title, descr, icon, reward, a.id);
  emitDay(req.user.id, todayStr(), 'ach-new', `✏️ ачивка «${title}» изменена`);
  res.json(q.get('SELECT * FROM achs WHERE id=?', a.id));
});

app.delete('/api/achs/:id', auth, (req, res) => {
  const a = q.get('SELECT * FROM achs WHERE id=?', Number(req.params.id));
  if (!a) return bad(res, 'Не найдено', 404);
  if (a.creator !== req.user.id) return bad(res, 'Удалять может только автор', 403);
  q.run('DELETE FROM ach_events WHERE ach_id=?', a.id);
  q.run('UPDATE achs SET parent_id=NULL WHERE parent_id=?', a.id);
  q.run('DELETE FROM achs WHERE id=?', a.id);
  emitDay(req.user.id, todayStr(), 'ach-new', `🗑 ачивка «${a.title}» удалена`);
  res.json({ ok: true });
});

app.post('/api/achs/:id/progress', auth, (req, res) => {
  const a = q.get('SELECT * FROM achs WHERE id=?', Number(req.params.id));
  if (!a) return bad(res, 'Не найдено', 404);
  const me = req.user.id, d = todayStr();
  if (a.owner !== null && a.owner !== me) {
    return bad(res, `Эту ачивку выполняет ${q.get('SELECT name FROM users WHERE id=?', a.owner)?.name || 'другой'}`, 403);
  }
  if (a.share_mode === 'race' && a.done_at) return bad(res, 'Гонка уже выиграна 🏁');
  if (!a.daily && a.done_at) return bad(res, 'Уже выполнена ✔');
  if (a.daily && a.done_date === d) return bad(res, 'Сегодня уже выполнена — возвращайся завтра 🔁');
  if (!achParentDone(a)) return bad(res, '🔒 Сначала выполни родительскую ачивку');

  let progress = a.progress;
  if (a.daily && a.last_date !== d) progress = 0; // ежедневная: прогресс сгорает на новый день
  const delta = Number(req.body && req.body.delta) < 0 ? -1 : 1;
  progress = Math.max(0, Math.min(a.target, progress + delta));

  if (progress >= a.target) {
    const t = now();
    q.run(`UPDATE achs SET progress=?, completions=completions+1, last_date=?, done_date=?, done_at=?, winner_id=? WHERE id=?`,
      a.target, d, d, t, a.share_mode === 'race' ? me : a.winner_id, a.id);
    const rewarded = a.owner !== null ? [a.owner]
      : a.share_mode === 'each' ? q.all('SELECT id FROM users').map((u) => u.id)
      : [me];
    for (const uid of rewarded) {
      q.run('INSERT INTO ach_events(ach_id,user_id,date,at,pts,title,icon,rarity) VALUES(?,?,?,?,?,?,?,?)',
        a.id, uid, d, t, a.xp, a.title, a.icon, a.rarity);
      emitDay(uid, d, 'ach', `🏆 ачивка «${a.title}» · +${a.xp} XP`, { rarity: a.rarity, by: me });
    }
    return res.json({ ach: q.get('SELECT * FROM achs WHERE id=?', a.id), completed: true, xp: a.xp });
  }

  q.run('UPDATE achs SET progress=?, last_date=? WHERE id=?', progress, d, a.id);
  emitDay(me, d, 'ach-new', `⛏ прогресс «${a.title}»: ${progress}/${a.target}`);
  res.json({ ach: q.get('SELECT * FROM achs WHERE id=?', a.id), completed: false });
});

app.post('/api/achs/:id/reopen', auth, (req, res) => {
  const a = q.get('SELECT * FROM achs WHERE id=?', Number(req.params.id));
  if (!a) return bad(res, 'Не найдено', 404);
  if (a.owner !== null && a.owner !== req.user.id) return bad(res, 'Не твоя ачивка', 403);
  if (a.daily) return bad(res, 'Ежедневную нельзя вернуть — она и так сбросится завтра');
  if (!a.done_at) return bad(res, 'Она ещё не выполнена');
  q.run('DELETE FROM ach_events WHERE ach_id=?', a.id);
  q.run('UPDATE achs SET progress=0, completions=0, last_date=NULL, done_date=NULL, done_at=NULL, winner_id=NULL WHERE id=?', a.id);
  emitDay(req.user.id, todayStr(), 'ach-new', `↩️ ачивка «${a.title}» возвращена в работу`);
  res.json({ ok: true });
});

/* --- чат --- */
app.get('/api/chat', auth, (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 60, 200);
  const before = Number(req.query.before) || null;
  const rows = before
    ? q.all('SELECT * FROM messages WHERE id<? ORDER BY id DESC LIMIT ?', before, limit)
    : q.all('SELECT * FROM messages ORDER BY id DESC LIMIT ?', limit);
  res.json({ messages: rows.reverse() });
});

app.post('/api/chat', auth, upload.single('photo'), (req, res) => {
  const text = String((req.body && req.body.text) || '').trim().slice(0, 4000);
  const photo = req.file ? req.file.filename : null;
  if (!text && !photo) return bad(res, 'Пустое сообщение');
  const r = q.run('INSERT INTO messages(user_id,text,photo,at) VALUES(?,?,?,?)', req.user.id, text || null, photo, now());
  const msg = q.get('SELECT * FROM messages WHERE id=?', Number(r.lastInsertRowid));
  io.emit('chat', msg);
  res.json(msg);
});

/* --- статистика --- */
app.get('/api/stats', auth, (req, res) => {
  const N = Math.min(Math.max(Number(req.query.days) || 14, 7), 60);
  const t = todayStr();
  const dates = [];
  for (let i = N - 1; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    dates.push(dt.toLocaleDateString('en-CA'));
  }
  const monday = (() => {
    const dt = new Date(); const wd = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - wd);
    return dt.toLocaleDateString('en-CA');
  })();

  const users = q.all('SELECT * FROM users ORDER BY id').map((u) => {
    const ptsRows = q.all(`
      SELECT date, SUM(pts) p FROM (
        SELECT date, pts FROM habit_checks WHERE user_id=?
        UNION ALL SELECT date, pts FROM posts WHERE user_id=?
        UNION ALL SELECT done_date AS date, pts FROM tasks WHERE assignee=? AND status='done' AND done_date IS NOT NULL
        UNION ALL SELECT date, pts FROM ach_events WHERE user_id=?
      ) GROUP BY date`, u.id, u.id, u.id, u.id);
    const byDate = Object.fromEntries(ptsRows.map((r) => [r.date, r.p]));
    const reports = new Set(q.all(`SELECT date FROM posts WHERE user_id=? AND type='report'`, u.id).map((r) => r.date));

    const earned = (dd) => (byDate[dd] || 0) >= 30 || reports.has(dd);
    let streak = 0;
    let cur = new Date();
    if (!earned(t)) cur.setDate(cur.getDate() - 1); // сегодня ещё не закрыт — не рвём стрик
    while (earned(cur.toLocaleDateString('en-CA'))) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    }

    const total = ptsRows.reduce((s, r) => s + r.p, 0);
    const weekPts = ptsRows.filter((r) => r.date >= monday && r.date <= t).reduce((s, r) => s + r.p, 0);
    const weights = q.all(
      `SELECT date, weight FROM posts WHERE user_id=? AND type='weight' AND weight IS NOT NULL ORDER BY at DESC LIMIT 30`, u.id)
      .reverse();
    const kcal = Object.fromEntries(q.all(
      `SELECT date, SUM(kcal) s FROM posts WHERE user_id=? AND type='meal' AND kcal IS NOT NULL GROUP BY date`, u.id)
      .map((r) => [r.date, r.s]));

    return {
      user: publicUser(u),
      daily: dates.map((dd) => byDate[dd] || 0),
      kcal: dates.map((dd) => kcal[dd] || 0),
      weights,
      total, weekPts, todayPts: byDate[t] || 0, streak,
      level: levelOf(total),
    };
  });

  res.json({ dates, users, monday });
});

/* --- фото (только для своих) --- */
app.use('/uploads', (req, res, next) => (getUser(req) ? next() : res.status(401).end()), express.static(UPLOADS));

/* ---------- socket.io ---------- */
const online = new Map(); // userId -> число подключений

io.use((socket, next) => {
  const tk = parseCookies(socket.handshake.headers.cookie).tk;
  const u = tk && q.get('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?', tk);
  if (!u) return next(new Error('unauthorized'));
  socket.data.uid = u.id;
  next();
});

io.on('connection', (socket) => {
  const id = socket.data.uid;
  online.set(id, (online.get(id) || 0) + 1);
  io.emit('online', [...online.keys()]);
  socket.on('disconnect', () => {
    const n = (online.get(id) || 1) - 1;
    if (n > 0) online.set(id, n); else online.delete(id);
    io.emit('online', [...online.keys()]);
  });
});

/* ---------- ошибки ---------- */
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError) return bad(res, 'Файл слишком большой (макс. 12 МБ)');
  bad(res, err.message || 'Ошибка сервера', err.status || 500);
});

/* корректное завершение: сворачиваем WAL в основной файл базы,
   чтобы рестарт/деплой никогда не оставлял данные «застрявшими» в WAL */
let shuttingDown = false;
function shutdown(sig) {
  if (shuttingDown) return;
  shuttingDown = true;
  try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch {}
  try { db.close(); } catch {}
  try { server.close(); } catch {}
  console.log(`\n${sig}: база сохранена, выходим.`);
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

server.listen(PORT, HOST, () => {
  console.log(`🗿 BECOME GIGACHAD — LIVE EDITION: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`   База: ${path.join(DATA, 'tandem.db')}`);
  console.log(`   ИИ-анализ фото: ${anthropic ? `включён (${AI_MODEL})` : 'выключен (нет ANTHROPIC_API_KEY)'}`);
});
