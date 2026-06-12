/* Импорт ачивок из бэкапа проекта Achievements в базу GIGACHAD.
   Запуск: node import-achievements.js <backup.json> <path/to/tandem.db>
   Маппинг профилей на пользователей — по имени (Илья/Антон), иначе по порядку.
   Идемпотентный: если ачивка с первым названием уже есть — прерывается. */
'use strict';
const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');

const [backupPath, dbPath] = process.argv.slice(2);
if (!backupPath || !dbPath) { console.error('usage: node import-achievements.js <backup.json> <db>'); process.exit(1); }

const j = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
if (!Array.isArray(j.profiles) || !Array.isArray(j.achievements)) { console.error('некорректный бэкап'); process.exit(1); }

const db = new DatabaseSync(dbPath);
const users = db.prepare('SELECT id, name FROM users ORDER BY id').all();
if (!users.length) { console.error('в базе нет пользователей'); process.exit(1); }

const norm = (s) => (s || '').toLowerCase().trim();
const players = j.profiles.filter((p) => p.is_player);
const sharedIds = new Set(j.profiles.filter((p) => !p.is_player).map((p) => p.id));

// профиль -> userId
const used = new Set();
const profMap = {};
for (const p of players) {
  let u = users.find((x) => norm(x.name).includes(norm(p.name)) || norm(p.name).includes(norm(x.name)));
  if (!u && (norm(p.name).startsWith('ант') || norm(p.name).includes('anton')))
    u = users.find((x) => norm(x.name).includes('anton') || norm(x.name).includes('ант'));
  if (!u) u = users.find((x) => !used.has(x.id)) || users[0];
  used.add(u.id);
  profMap[p.id] = u.id;
}
console.log('Маппинг профилей:');
for (const p of players) console.log('  ', p.name, '→', users.find((u) => u.id === profMap[p.id]).name);

// идемпотентность
const firstTitle = j.achievements[0] && j.achievements[0].title;
if (firstTitle && db.prepare('SELECT id FROM achs WHERE title=?').get(firstTitle)) {
  console.error(`\n⚠ Похоже, уже импортировано (есть ачивка «${firstTitle}»). Прерываю, ничего не меняю.`);
  process.exit(2);
}

const RAR = { common: 10, uncommon: 25, rare: 50, epic: 100, legendary: 250 };
const baseTime = Date.now();
const ins = db.prepare(`INSERT INTO achs
  (creator,owner,share_mode,title,descr,icon,rarity,xp,target,daily,parent_id,reward,progress,completions,created_at)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

const idMap = {};
let i = 0;
for (const a of j.achievements) {
  const shared = sharedIds.has(a.profile_id);
  const owner = shared ? null : (profMap[a.profile_id] ?? users[0].id);
  const share = shared ? (a.share_mode === 'race' ? 'race' : 'each') : null;
  const rarity = RAR[a.difficulty] != null ? a.difficulty : 'epic';
  const xp = Number.isFinite(a.xp) && a.xp > 0 ? Math.round(a.xp) : RAR[rarity];
  const target = Number.isFinite(a.target) && a.target > 0 ? Math.round(a.target) : 1;
  const daily = a.daily ? 1 : 0;
  const icon = (a.icon && String(a.icon)) || '🏆';
  const creator = owner != null ? owner : users[0].id;
  const progress = Math.min(Math.max(0, Math.round(Number(a.progress) || 0)), target);
  const descr = a.description ? String(a.description).slice(0, 1000) : null;
  const reward = a.reward_text ? String(a.reward_text).slice(0, 200) : null;
  const r = ins.run(creator, owner, share, String(a.title).slice(0, 120), descr, icon,
    rarity, xp, target, daily, null, reward, progress, 0, baseTime + (i++));
  idMap[a.id] = Number(r.lastInsertRowid);
}

// пересборка дерева (parent_id: строковый id → новый числовой)
const upd = db.prepare('UPDATE achs SET parent_id=? WHERE id=?');
let parents = 0;
for (const a of j.achievements) {
  if (a.parent_id && idMap[a.parent_id]) { upd.run(idMap[a.parent_id], idMap[a.id]); parents++; }
}

console.log(`\n✅ Импортировано ачивок: ${j.achievements.length}, восстановлено связей-родителей: ${parents}`);
console.log('Иконок-картинок сохранено:', j.achievements.filter((a) => a.icon && String(a.icon).startsWith('data:')).length);
db.close();
