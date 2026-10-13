/* 🇸🇰 Словацкий с нуля — вкладка «Язык»: курс, уроки, повторение слов, ИИ-репетитор (ChatGPT).
   Использует общие хелперы из app.js ($, esc, api, toast, state, refreshMe) — они
   нужны только во время вызовов, поэтому файл подключается до app.js. */
'use strict';

const Slovak = (() => {
  const C = window.SK_COURSE;
  const UNITS = C.UNITS;
  const DIACR = ['á', 'ä', 'č', 'ď', 'é', 'í', 'ĺ', 'ľ', 'ň', 'ó', 'ô', 'ŕ', 'š', 'ť', 'ú', 'ý', 'ž'];

  /* все слова курса без повторов: { sk, ru, unit } */
  const ALL = [];
  const BY_SK = new Map();
  UNITS.forEach((u, i) => u.words.forEach(([sk, ru]) => {
    const k = sk.toLowerCase();
    if (BY_SK.has(k)) return;
    const w = { sk, ru, unit: i };
    BY_SK.set(k, w);
    ALL.push(w);
  }));

  const st = {
    view: 'course',   // course | unit | run | done | review | tutor
    data: null,       // /api/sk/state
    unit: null,       // открытая тема
    run: null,        // идущий урок / повторение
    result: null,     // итог урока
    chatMode: 'free', // free | grammar | role:<id> | roles (выбор сценки)
    chat: [], chatFor: null, sending: false,
  };

  /* ---------- утилиты ---------- */
  const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = (s) => String(s).toLowerCase().replace(/[.,!?¿¡…:;"«»()–—]/g, ' ').replace(/\s+/g, ' ').trim();
  const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
  /* ok — точно; accent — верно, но без диакритики; bad — неверно */
  function compare(given, expected) {
    const g = norm(given), e = norm(expected);
    if (!g) return 'bad';
    if (g === e) return 'ok';
    if (strip(g) === strip(e)) return 'accent';
    return 'bad';
  }
  const typable = (sk) => !sk.includes('…') && sk.length <= 22;
  const progressOf = (id) => (st.data ? st.data.progress.find((p) => p.unit === id) : null);
  const isDone = (i) => !!(progressOf(UNITS[i].id) || {}).done_at;
  const isOpen = (i) => i === 0 || isDone(i - 1) || !!progressOf(UNITS[i].id);
  const sfx = (n) => window.Sound && Sound.play(n);

  /* варианты ответа: правильный + 3 похожих (сначала из той же темы) */
  function options(w, field) {
    const same = shuffle(ALL.filter((x) => x.unit === w.unit && x.sk !== w.sk));
    const near = shuffle(ALL.filter((x) => x.unit !== w.unit && Math.abs(x.unit - w.unit) <= 3));
    const out = [w[field]];
    for (const x of [...same, ...near, ...shuffle(ALL)]) {
      if (out.length >= 4) break;
      if (!out.some((o) => norm(o) === norm(x[field]))) out.push(x[field]);
    }
    return shuffle(out);
  }

  /* ---------- озвучка ---------- */
  let skVoice = null;
  function pickVoice() {
    try { skVoice = speechSynthesis.getVoices().find((v) => /^sk([-_]|$)/i.test(v.lang)) || null; } catch { skVoice = null; }
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    try { speechSynthesis.addEventListener('voiceschanged', pickVoice); } catch {}
  }
  const canSpeak = () => !!skVoice || !!(st.data && st.data.tutor);
  let audio = null;
  /* auto — озвучка без нажатия: молча, если звук недоступен */
  function speak(text, slow, auto) {
    text = String(text).replace(/…/g, '').trim();
    if (!text) return;
    if (skVoice) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = skVoice; u.lang = skVoice.lang; u.rate = slow ? 0.6 : 0.85;
      speechSynthesis.speak(u);
      return;
    }
    if (st.data && st.data.tutor) {
      if (audio) audio.pause();
      audio = new Audio('/api/sk/tts?text=' + encodeURIComponent(text));
      audio.playbackRate = slow ? 0.75 : 1;
      audio.play().catch(() => { if (!auto) toast('Не удалось воспроизвести звук', 'err'); });
      return;
    }
    if (!auto) toast('Нет словацкого голоса: включи ChatGPT на сервере или поставь голос «slovenčina» в системе', 'err');
  }
  const sayBtn = (text, cls = '') => (canSpeak() ? `<button class="sk-say ${cls}" data-say="${esc(text)}" title="Послушать">🔊</button>` : '');
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-say]');
    if (b) { e.stopPropagation(); speak(b.dataset.say, b.dataset.slow === '1'); }
  });

  /* ---------- данные ---------- */
  async function load() {
    st.data = await api('/api/sk/state');
    updateBadge();
    return st.data;
  }
  function updateBadge() {
    const b = $('#skBadge');
    if (!b || !st.data) return;
    const n = st.data.due;
    b.hidden = !n;
    b.textContent = n > 99 ? '99+' : n;
  }

  async function open() {
    if (st.view === 'run' && st.run) return renderRun();
    try { await load(); } catch (e) { toast(e.message, 'err'); }
    render();
  }

  function go(view) { st.view = view; render(); window.scrollTo(0, 0); }

  function render() {
    if (state.tab !== 'sk') return;
    if (!st.data) { $('#main').innerHTML = '<div class="empty">Загрузка…</div>'; return; }
    if (st.view === 'unit') return renderUnit();
    if (st.view === 'run') return renderRun();
    if (st.view === 'done') return renderDone();
    if (st.view === 'review') return renderReview();
    if (st.view === 'tutor') return renderTutor();
    renderCourse();
  }

  const topSeg = () => `
    <div class="seg sk-seg">
      <button data-v="course" class="${st.view === 'course' ? 'active' : ''}">📚 Курс</button>
      <button data-v="review" class="${st.view === 'review' ? 'active' : ''}">🔁 Повтор${st.data.due ? ` · ${st.data.due}` : ''}</button>
      <button data-v="tutor" class="${st.view === 'tutor' ? 'active' : ''}">🤖 Репетитор</button>
    </div>`;
  function wireSeg() {
    document.querySelectorAll('.sk-seg [data-v]').forEach((b) => b.addEventListener('click', () => go(b.dataset.v)));
  }

  /* ====================================================================
     КУРС
  ==================================================================== */
  function renderCourse() {
    const d = st.data;
    const done = UNITS.filter((u, i) => isDone(i)).length;
    const nextI = UNITS.findIndex((u, i) => !isDone(i));
    const next = nextI >= 0 ? UNITS[nextI] : null;

    const head = `
      <div class="card">
        <h3>🇸🇰 Словацкий с нуля</h3>
        <div class="day-summary">
          <div class="ds-chip">✅ ${done}/${UNITS.length}<small>тем пройдено</small></div>
          <div class="ds-chip">🧠 ${d.words}<small>слов в словаре</small></div>
          <div class="ds-chip">💪 ${d.strong}<small>выучено крепко</small></div>
          <div class="ds-chip">⚡ ${d.todayPts}<small>очков сегодня</small></div>
        </div>
        <div class="bar"><i style="width:${Math.round((done / UNITS.length) * 100)}%"></i></div>
        ${next ? `<button class="btn-primary sk-wide" id="skNext">▶ ${done ? 'Продолжить' : 'Начать'}: ${esc(next.emoji)} ${esc(next.title)}</button>`
          : '<p class="sk-note">🏆 Весь курс пройден! Повторяй слова и болтай с репетитором — так знания закрепятся.</p>'}
        ${d.due ? `<button class="btn-ghost sk-wide" id="skDue">🔁 Повторить слова · ${d.due}</button>` : ''}
      </div>`;

    const list = UNITS.map((u, i) => {
      const p = progressOf(u.id);
      const open = isOpen(i);
      const status = isDone(i) ? `<span class="sk-st ok">✔ ${Math.round(p.best * 100)}%</span>`
        : p ? `<span class="sk-st">${Math.round(p.best * 100)}%</span>`
        : open ? '<span class="sk-st new">NEW</span>' : '<span class="sk-st">🔒</span>';
      return `
        <div class="sk-unit ${open ? '' : 'locked'}" data-unit="${i}">
          <span class="sk-u-emoji">${u.emoji}</span>
          <div class="sk-u-body"><div class="sk-u-num">Тема ${i + 1}</div><div class="sk-u-title">${esc(u.title)}</div></div>
          ${status}
        </div>`;
    }).join('');

    $('#main').innerHTML = topSeg() + head + `<div class="card sk-units">${list}</div>`;
    wireSeg();
    $('#skNext') && $('#skNext').addEventListener('click', () => openUnit(nextI));
    $('#skDue') && $('#skDue').addEventListener('click', () => go('review'));
    document.querySelectorAll('[data-unit]').forEach((el) => el.addEventListener('click', () => {
      const i = Number(el.dataset.unit);
      if (!isOpen(i) && !confirm('Эта тема ещё закрыта — сначала пройди предыдущую. Открыть всё равно?')) return;
      openUnit(i);
    }));
  }

  function openUnit(i) { st.unit = i; go('unit'); }

  function renderUnit() {
    const u = UNITS[st.unit];
    const p = progressOf(u.id);
    $('#main').innerHTML = `
      <button class="btn-ghost sk-back" id="skBack">‹ Все темы</button>
      <div class="card">
        <h3>${u.emoji} Тема ${st.unit + 1} · ${esc(u.title)}</h3>
        <div class="sk-read sk-theory">${u.theory}</div>
      </div>
      <div class="card">
        <h3>Слова · ${u.words.length}</h3>
        ${u.words.map(([sk, ru]) => `
          <div class="sk-word">${sayBtn(sk)}<b class="sk-read">${esc(sk)}</b><span class="sk-read">${esc(ru)}</span></div>`).join('')}
      </div>
      <div class="card">
        <h3>Фразы</h3>
        ${u.phrases.map(([sk, ru]) => `
          <div class="sk-word">${sayBtn(sk)}<b class="sk-read">${esc(sk)}</b><span class="sk-read">${esc(ru)}</span></div>`).join('')}
      </div>
      <button class="btn-primary sk-wide" id="skStart">▶ ${p && p.done_at ? 'Пройти урок ещё раз' : 'Начать урок'} (~15 заданий)</button>
      ${st.data.tutor ? '<button class="btn-ghost sk-wide" id="skAsk">🤖 Спросить репетитора по этой теме</button>' : ''}
      ${p ? `<p class="sk-note">Лучший результат: ${Math.round(p.best * 100)}% · попыток: ${p.runs}. Для зачёта нужно ${Math.round(C.PASS * 100)}%.</p>` : ''}`;
    $('#skBack').addEventListener('click', () => go('course'));
    $('#skStart').addEventListener('click', () => startLesson(st.unit));
    $('#skAsk') && $('#skAsk').addEventListener('click', () => {
      st.chatMode = 'grammar';
      st.prefill = `Объясни подробнее тему «${u.title}» и дай пару упражнений`;
      go('tutor');
    });
  }

  /* ====================================================================
     УРОК / ПОВТОРЕНИЕ — генерация заданий
  ==================================================================== */
  function wordTask(w, level) {
    const kinds = ['sk2ru', 'ru2sk'];
    if (canSpeak()) kinds.push('listen');
    if (typable(w.sk)) kinds.push('type');
    let kind;
    if (level === 'easy') kind = shuffle(kinds.filter((k) => k !== 'type'))[0];
    else if (level === 'hard' && kinds.includes('type')) kind = Math.random() < 0.6 ? 'type' : shuffle(kinds)[0];
    else kind = shuffle(kinds)[0];
    if (kind === 'sk2ru') return { kind, w, answer: w.ru, opts: options(w, 'ru') };
    if (kind === 'type') return { kind, w, answer: w.sk };
    return { kind, w, answer: w.sk, opts: options(w, 'sk') };
  }

  const splitWords = (s) => s.replace(/[.,!?¿¡…:;"«»()–—]/g, ' ').split(/\s+/).filter(Boolean);
  function phraseTask(sk, ru, allPhrases) {
    const words = splitWords(sk);
    const own = new Set(words.map((x) => x.toLowerCase()));
    const pool = new Map();
    allPhrases.flatMap(([x]) => splitWords(x)).forEach((x) => { if (!own.has(x.toLowerCase())) pool.set(x.toLowerCase(), x); });
    const extra = shuffle([...pool.values()]).slice(0, 3);
    return { kind: 'tiles', sk, ru, answer: sk, tiles: shuffle([...words, ...extra]) };
  }

  function startLesson(i) {
    const u = UNITS[i];
    const words = shuffle(u.words.map(([sk]) => BY_SK.get(sk.toLowerCase())));
    const tasks = [];
    const matchW = words.slice(0, 5);
    const rest = words.slice(5, 15);
    rest.forEach((w, n) => tasks.push(wordTask(w, n < rest.length / 2 ? 'easy' : 'mid')));
    const ph = shuffle(u.phrases).slice(0, 4);
    const phTasks = ph.map(([sk, ru]) => phraseTask(sk, ru, u.phrases));
    // пары — в начало, фразы — ближе к концу
    const all = [{ kind: 'match', words: matchW }, ...tasks.slice(0, 4), ...shuffle([...tasks.slice(4), ...phTasks])];
    st.run = { type: 'lesson', unit: i, tasks: all, queue: all.map((t, n) => n), first: {}, pos: 0, total: all.length, wordRes: {} };
    go('run');
  }

  async function startReview(extra) {
    let r;
    try { r = await api('/api/sk/review' + (extra ? '?extra=1' : '')); } catch (e) { return toast(e.message, 'err'); }
    if (!r.cards.length) { toast('Пока нечего повторять'); return; }
    const tasks = shuffle(r.cards).map((c) => {
      const w = BY_SK.get(c.sk.toLowerCase()) || { sk: c.sk, ru: c.ru, unit: 0 };
      return wordTask(w, c.box <= 1 ? 'easy' : c.box >= 3 ? 'hard' : 'mid');
    });
    st.run = { type: 'review', tasks, queue: tasks.map((t, n) => n), first: {}, pos: 0, total: tasks.length, wordRes: {} };
    go('run');
  }

  /* ====================================================================
     УРОК — отрисовка задания
  ==================================================================== */
  function renderRun() {
    const r = st.run;
    if (!r) return go('course');
    const ti = r.queue[0];
    const t = r.tasks[ti];
    const doneN = Object.keys(r.first).length;
    const retry = r.first[ti] !== undefined;

    let body = '';
    const title = {
      sk2ru: 'Как переводится?', ru2sk: 'Выбери перевод', listen: 'Что ты слышишь?',
      type: 'Напиши по-словацки', tiles: 'Собери фразу', match: 'Найди пары',
    }[t.kind];

    if (t.kind === 'sk2ru') {
      body = `<div class="sk-prompt sk-read">${esc(t.w.sk)} ${sayBtn(t.w.sk)}</div>${optsHtml(t.opts)}`;
    } else if (t.kind === 'ru2sk') {
      body = `<div class="sk-prompt sk-read">${esc(t.w.ru)}</div>${optsHtml(t.opts)}`;
    } else if (t.kind === 'listen') {
      body = `<div class="sk-prompt"><button class="sk-say big" data-say="${esc(t.w.sk)}">🔊</button>
        <button class="sk-say" data-say="${esc(t.w.sk)}" data-slow="1" title="Медленно">🐢</button></div>${optsHtml(t.opts)}`;
    } else if (t.kind === 'type') {
      body = `<div class="sk-prompt sk-read">${esc(t.w.ru)}</div>
        <input id="skInput" class="sk-input sk-read" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="по-словацки…">
        ${diacrHtml()}`;
    } else if (t.kind === 'tiles') {
      body = `<div class="sk-prompt sk-read">${esc(t.ru)}</div>
        <div class="sk-line" id="skLine"></div>
        <div class="sk-tiles" id="skTiles">${t.tiles.map((x, n) => `<button class="sk-tile sk-read" data-tile="${n}">${esc(x)}</button>`).join('')}</div>`;
    } else if (t.kind === 'match') {
      const right = shuffle(t.words);
      body = `<div class="sk-match">
        <div>${t.words.map((w) => `<button class="sk-m sk-read" data-l="${esc(w.sk)}">${esc(w.sk)}</button>`).join('')}</div>
        <div>${right.map((w) => `<button class="sk-m sk-read" data-r="${esc(w.sk)}">${esc(w.ru)}</button>`).join('')}</div>
      </div>`;
    }

    const needCheck = t.kind === 'type' || t.kind === 'tiles';
    $('#main').innerHTML = `
      <div class="sk-runbar">
        <button class="sk-x" id="skExit" title="Выйти">✕</button>
        <div class="bar"><i style="width:${Math.round((doneN / r.total) * 100)}%"></i></div>
        <span>${doneN}/${r.total}</span>
      </div>
      <div class="card sk-task">
        <h3>${title}${retry ? ' <span class="sk-retry">повтор ошибки</span>' : ''}</h3>
        ${body}
      </div>
      <div id="skFeedback"></div>
      ${needCheck ? '<button class="btn-primary sk-wide" id="skCheck">Проверить</button>' : ''}`;

    $('#skExit').addEventListener('click', () => {
      if (!confirm('Выйти? Прогресс этого урока не сохранится.')) return;
      const back = r.type === 'review' ? 'review' : 'unit';
      st.run = null;
      go(back);
    });

    if (t.kind === 'listen') setTimeout(() => speak(t.w.sk, false, true), 250);
    document.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => {
      if (b.closest('.answered')) return;
      b.classList.add('picked');
      $('.sk-opts').classList.add('answered');
      check(b.dataset.opt);
    }));

    if (t.kind === 'type') {
      const inp = $('#skInput');
      if (window.innerWidth >= 1024) inp.focus();
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#skCheck') && $('#skCheck').click(); } });
      wireDiacr(inp, $('.sk-task'));
      $('#skCheck').addEventListener('click', () => { if (inp.value.trim()) check(inp.value); });
    }

    if (t.kind === 'tiles') {
      const picked = [];
      const line = $('#skLine');
      const redraw = () => {
        line.innerHTML = picked.map((n) => `<button class="sk-tile sk-read" data-back="${n}">${esc(t.tiles[n])}</button>`).join('');
        document.querySelectorAll('#skTiles [data-tile]').forEach((b) => { b.disabled = picked.includes(Number(b.dataset.tile)); });
        line.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => {
          if ($('#skFeedback').innerHTML) return;
          picked.splice(picked.indexOf(Number(b.dataset.back)), 1); redraw();
        }));
      };
      document.querySelectorAll('#skTiles [data-tile]').forEach((b) => b.addEventListener('click', () => {
        if ($('#skFeedback').innerHTML) return;
        picked.push(Number(b.dataset.tile)); sfx('click'); redraw();
      }));
      $('#skCheck').addEventListener('click', () => { if (picked.length) check(picked.map((n) => t.tiles[n]).join(' ')); });
    }

    if (t.kind === 'match') wireMatch(t);
  }

  const optsHtml = (opts) => `<div class="sk-opts">${opts.map((o) => `<button class="sk-opt sk-read" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  const diacrHtml = () => `<div class="sk-diacr">${DIACR.map((c) => `<button type="button" class="sk-read" data-ch="${c}">${c}</button>`).join('')}</div>`;
  function wireDiacr(inp, root) {
    root.querySelectorAll('[data-ch]').forEach((b) => {
      b.addEventListener('mousedown', (e) => e.preventDefault()); // не терять фокус на ПК
      b.addEventListener('click', () => {
        const s = inp.selectionStart ?? inp.value.length, e = inp.selectionEnd ?? inp.value.length;
        inp.value = inp.value.slice(0, s) + b.dataset.ch + inp.value.slice(e);
        inp.setSelectionRange(s + 1, s + 1);
        inp.focus();
      });
    });
  }

  function wireMatch(t) {
    let sel = null, left = t.words.length, errors = 0;
    const L = document.querySelectorAll('[data-l]'), R = document.querySelectorAll('[data-r]');
    const tryPair = (l, r) => {
      if (l.dataset.l === r.dataset.r) {
        l.classList.add('ok'); r.classList.add('ok'); l.disabled = r.disabled = true;
        sfx('step');
        speak(l.dataset.l, false, true);
        if (--left === 0) finish(errors === 0, errors ? `ошибок: ${errors}` : '');
      } else {
        errors++;
        st.run.matchBad = st.run.matchBad || new Set();
        st.run.matchBad.add(l.dataset.l);
        sfx('error');
        [l, r].forEach((x) => { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 450); });
      }
      L.forEach((x) => x.classList.remove('sel')); R.forEach((x) => x.classList.remove('sel'));
      sel = null;
    };
    const pick = (el, side) => {
      if (el.disabled) return;
      if (sel && sel.side !== side) return tryPair(side === 'r' ? sel.el : el, side === 'r' ? el : sel.el);
      (side === 'l' ? L : R).forEach((x) => x.classList.remove('sel'));
      el.classList.add('sel');
      sel = { el, side };
    };
    L.forEach((el) => el.addEventListener('click', () => pick(el, 'l')));
    R.forEach((el) => el.addEventListener('click', () => pick(el, 'r')));
  }

  /* ---------- проверка ответа ---------- */
  function check(given) {
    const r = st.run, ti = r.queue[0], t = r.tasks[ti];
    let res = compare(given, t.answer);
    if (t.kind === 'sk2ru' || t.kind === 'ru2sk' || t.kind === 'listen') res = given === t.answer ? 'ok' : 'bad';
    const ok = res !== 'bad';

    document.querySelectorAll('[data-opt]').forEach((b) => {
      if (b.dataset.opt === t.answer) b.classList.add('ok');
      else if (b.classList.contains('picked')) b.classList.add('bad');
    });
    if ($('#skInput')) $('#skInput').disabled = true;

    let msg = '';
    if (res === 'accent') msg = `Почти! Обрати внимание на диакритику: <b class="sk-read">${esc(t.answer)}</b>`;
    else if (!ok) msg = `Правильно: <b class="sk-read">${esc(t.answer)}</b>`;
    if (ok && (t.kind === 'listen' || t.kind === 'ru2sk')) msg = `<span class="sk-read">${esc(t.w.sk)} — ${esc(t.w.ru)}</span>`;
    finish(ok, msg, given);
  }

  function finish(ok, msg, given) {
    const r = st.run, ti = r.queue[0], t = r.tasks[ti];
    if (r.first[ti] === undefined) r.first[ti] = ok;
    const sayText = t.kind === 'tiles' ? t.sk : t.w ? t.w.sk : '';
    // результаты по словам — по первой попытке
    if (t.w && r.wordRes[t.w.sk] === undefined) r.wordRes[t.w.sk] = ok;
    if (t.kind === 'match') t.words.forEach((w) => {
      if (r.wordRes[w.sk] === undefined) r.wordRes[w.sk] = !(r.matchBad && r.matchBad.has(w.sk));
    });
    sfx(ok ? 'complete' : 'error');
    if (ok && sayText && t.kind !== 'match' && t.kind !== 'listen') speak(sayText, false, true);

    const fb = $('#skFeedback');
    const canExplain = !ok && st.data.tutor;
    fb.innerHTML = `
      <div class="sk-fb ${ok ? 'ok' : 'bad'}">
        <div class="sk-fb-title">${ok ? '✅ Верно!' : '❌ Не совсем'}</div>
        ${msg ? `<div class="sk-fb-msg">${msg} ${!ok && sayText ? sayBtn(sayText) : ''}</div>` : ''}
        <div id="skExplain"></div>
        <div class="sk-fb-btns">
          ${canExplain ? '<button class="btn-ghost" id="skWhy">🤖 Почему?</button>' : ''}
          <button class="btn-primary" id="skNextTask">Дальше →</button>
        </div>
      </div>`;
    $('#skCheck') && $('#skCheck').remove();
    $('#skNextTask').focus();
    $('#skNextTask').addEventListener('click', () => {
      r.queue.shift();
      if (!ok && t.kind !== 'match') r.queue.push(ti); // ошибку повторим в конце
      if (!r.queue.length) return endRun();
      renderRun();
    });
    $('#skWhy') && $('#skWhy').addEventListener('click', async (e) => {
      e.target.disabled = true;
      $('#skExplain').innerHTML = '<div class="sk-note">🤖 думаю…</div>';
      const task = t.kind === 'tiles' ? `Перевести на словацкий: «${t.ru}»`
        : t.kind === 'sk2ru' ? `Перевести на русский: «${t.w.sk}»`
        : t.kind === 'listen' ? `Узнать на слух словацкое слово «${t.w.sk}»`
        : `Перевести на словацкий: «${t.w.ru}»`;
      try {
        const x = await api('/api/sk/explain', { method: 'POST', body: { task, expected: t.answer, given: given || '' } });
        $('#skExplain').innerHTML = `<div class="sk-explain sk-read">${esc(x.text)}</div>`;
      } catch (err) { $('#skExplain').innerHTML = ''; toast(err.message, 'err'); e.target.disabled = false; }
    });
  }

  async function endRun() {
    const r = st.run;
    const correct = Object.values(r.first).filter(Boolean).length;
    const words = Object.entries(r.wordRes).map(([sk, ok]) => ({ sk, ok }));
    st.run = null;
    st.result = { type: r.type, unit: r.unit, correct, total: r.total, saving: true };
    go('done');
    try {
      const res = r.type === 'lesson'
        ? await api('/api/sk/lesson', { method: 'POST', body: { unit: UNITS[r.unit].id, correct, total: r.total, words } })
        : await api('/api/sk/review', { method: 'POST', body: { results: words } });
      Object.assign(st.result, res, { saving: false });
      if (res.pts) { toast(`+${res.pts} очков ⚡`, 'ok'); sfx(res.firstPass ? 'levelup' : 'complete'); }
      await load();
      refreshMe();
    } catch (e) {
      st.result.saving = false; st.result.error = e.message;
      toast(e.message, 'err');
    }
    if (st.view === 'done') renderDone();
  }

  function renderDone() {
    const x = st.result;
    if (!x) return go('course');
    const pct = Math.round((x.correct / x.total) * 100);
    const isLesson = x.type === 'lesson';
    const passed = isLesson ? pct >= C.PASS * 100 : true;
    const nextI = isLesson ? x.unit + 1 : -1;
    $('#main').innerHTML = `
      <div class="card sk-done">
        <div class="sk-done-emoji">${passed ? (pct === 100 ? '🏆' : '🎉') : '💪'}</div>
        <h3>${isLesson ? (passed ? 'Урок пройден!' : 'Почти получилось') : 'Повторение завершено'}</h3>
        <div class="sk-done-pct">${pct}%</div>
        <p class="sk-note">Верно с первой попытки: ${x.correct} из ${x.total}${isLesson && !passed ? ` · для зачёта нужно ${Math.round(C.PASS * 100)}%` : ''}</p>
        ${x.saving ? '<p class="sk-note">Сохраняю…</p>' : ''}
        ${x.pts ? `<p class="sk-pts">+${x.pts} ⚡ очков${x.firstPass ? ' · новая тема открыта!' : ''}</p>` : ''}
        ${x.error ? `<p class="sk-note err">${esc(x.error)}</p>` : ''}
      </div>
      ${isLesson && passed && nextI < UNITS.length ? `<button class="btn-primary sk-wide" id="skGoNext">▶ Дальше: ${UNITS[nextI].emoji} ${esc(UNITS[nextI].title)}</button>` : ''}
      ${isLesson ? `<button class="${passed ? 'btn-ghost' : 'btn-primary'} sk-wide" id="skAgain">🔄 Пройти ещё раз</button>` : ''}
      ${!isLesson && st.data && st.data.due ? `<button class="btn-primary sk-wide" id="skMore">🔁 Ещё ${st.data.due} к повторению</button>` : ''}
      <button class="btn-ghost sk-wide" id="skHome">📚 К темам</button>`;
    $('#skGoNext') && $('#skGoNext').addEventListener('click', () => openUnit(nextI));
    $('#skAgain') && $('#skAgain').addEventListener('click', () => startLesson(x.unit));
    $('#skMore') && $('#skMore').addEventListener('click', () => startReview(false));
    $('#skHome').addEventListener('click', () => go('course'));
  }

  /* ====================================================================
     ПОВТОРЕНИЕ
  ==================================================================== */
  function renderReview() {
    const d = st.data;
    let html;
    if (!d.words) {
      html = `<div class="card"><h3>🔁 Интервальное повторение</h3>
        <p class="sk-read sk-p">Здесь будут слова из пройденных уроков. Каждое слово возвращается через 1, 2, 4, 8, 16… дней —
        ровно тогда, когда ты начинаешь его забывать. Ошибся — слово начинает круг заново.</p>
        <button class="btn-primary sk-wide" id="skToCourse">▶ Пройти первый урок</button></div>`;
    } else if (d.due) {
      html = `<div class="card"><h3>🔁 Повторение</h3>
        <div class="day-summary">
          <div class="ds-chip">⏰ ${d.due}<small>ждут повторения</small></div>
          <div class="ds-chip">🧠 ${d.words}<small>всего слов</small></div>
          <div class="ds-chip">💪 ${d.strong}<small>выучено крепко</small></div>
        </div>
        <button class="btn-primary sk-wide" id="skReview">▶ Повторить ${Math.min(d.due, 20)} слов · +10 ⚡</button></div>`;
    } else {
      html = `<div class="card"><h3>🔁 Повторение</h3>
        <p class="sk-read sk-p">✅ На сегодня всё повторено! Следующие слова появятся завтра.</p>
        <div class="day-summary">
          <div class="ds-chip">🧠 ${d.words}<small>всего слов</small></div>
          <div class="ds-chip">💪 ${d.strong}<small>выучено крепко</small></div>
        </div>
        <button class="btn-ghost sk-wide" id="skExtra">🏋️ Потренировать слабые слова</button></div>`;
    }
    $('#main').innerHTML = topSeg() + html;
    wireSeg();
    $('#skToCourse') && $('#skToCourse').addEventListener('click', () => go('course'));
    $('#skReview') && $('#skReview').addEventListener('click', () => startReview(false));
    $('#skExtra') && $('#skExtra').addEventListener('click', () => startReview(true));
  }

  /* ====================================================================
     ИИ-РЕПЕТИТОР (ChatGPT)
  ==================================================================== */
  const MODES = [['free', '💬 Разговор'], ['roles', '🎭 Сценки'], ['grammar', '❓ Вопросы']];
  const QUESTIONS = [
    'Чем отличается y от i?', 'Как сказать «я хочу пить»?', 'Объясни падежи простыми словами',
    'Когда пишется «sa»?', 'Как вежливо попросить счёт?', 'Какие слова похожи на русские, но значат другое?',
  ];

  function renderTutor() {
    if (!st.data.tutor) {
      $('#main').innerHTML = topSeg() + `
        <div class="card"><h3>🤖 ИИ-репетитор</h3>
          <p class="sk-read sk-p">Репетитор работает на ChatGPT, но ключ OpenAI на сервере ещё не задан.</p>
          <p class="sk-read sk-p">Владельцу сервера: добавь в <code>.env</code> строку <code>OPENAI_API_KEY=sk-...</code> (ключ — на platform.openai.com → API keys) и перезапусти приложение.</p>
          <p class="sk-read sk-p">Курс и повторение работают и без него.</p>
        </div>`;
      return wireSeg();
    }
    const mode = st.chatMode;
    const modeKey = mode.startsWith('role:') ? 'roles' : mode;
    const seg = `<div class="seg sk-modes">${MODES.map(([k, t]) => `<button data-mode="${k}" class="${modeKey === k ? 'active' : ''}">${t}</button>`).join('')}</div>`;

    if (mode === 'roles') {
      $('#main').innerHTML = topSeg() + seg + `
        <div class="card"><h3>🎭 Выбери сценку</h3>
          <p class="sk-read sk-p">ChatGPT сыграет роль, а ты — себя. Отвечай по-словацки как получится: ошибки он исправит.</p>
          <div class="sk-scen">${C.SCENARIOS.map((s) => `<button class="sk-sc" data-sc="${s.id}"><span>${s.emoji}</span>${esc(s.title)}</button>`).join('')}</div>
        </div>`;
      wireSeg(); wireModes();
      document.querySelectorAll('[data-sc]').forEach((b) => b.addEventListener('click', () => { st.chatMode = 'role:' + b.dataset.sc; renderTutor(); }));
      return;
    }

    const scen = mode.startsWith('role:') ? C.SCENARIOS.find((s) => 'role:' + s.id === mode) : null;
    $('#main').innerHTML = topSeg() + seg + `
      <div class="sk-chat">
        <div class="sk-chat-head">
          <span>${scen ? `${scen.emoji} ${esc(scen.title)}` : mode === 'grammar' ? '❓ Спроси что угодно о словацком' : '💬 Болтаем по-словацки'}</span>
          <button id="skClear" title="Начать заново">🗑</button>
        </div>
        <div id="skChatList"></div>
        <div id="skChatDiacr" hidden>${diacrHtml()}</div>
        <form id="skChatForm">
          <button type="button" class="icon-btn" id="skDiacrBtn" title="Словацкие буквы">á</button>
          <input type="text" id="skChatInput" class="sk-read" autocomplete="off" placeholder="${mode === 'grammar' ? 'Вопрос по-русски…' : 'Napíš po slovensky…'}">
          <button type="submit" class="icon-btn send">➤</button>
        </form>
      </div>`;
    wireSeg(); wireModes();

    const inp = $('#skChatInput');
    wireDiacr(inp, $('#skChatDiacr'));
    if (st.prefill) { inp.value = st.prefill; st.prefill = null; }
    $('#skDiacrBtn').addEventListener('click', () => { $('#skChatDiacr').hidden = !$('#skChatDiacr').hidden; });
    $('#skClear').addEventListener('click', async () => {
      if (!confirm('Очистить этот разговор и начать заново?')) return;
      await api('/api/sk/chat?mode=' + encodeURIComponent(mode), { method: 'DELETE' }).catch((e) => toast(e.message, 'err'));
      st.chat = []; st.chatFor = null;
      loadChat();
    });
    $('#skChatForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const text = inp.value.trim();
      if (!text || st.sending) return;
      inp.value = '';
      send(text);
    });
    loadChat();
  }

  function wireModes() {
    document.querySelectorAll('.sk-modes [data-mode]').forEach((b) => b.addEventListener('click', () => {
      st.chatMode = b.dataset.mode;
      renderTutor();
    }));
  }

  async function loadChat() {
    const mode = st.chatMode;
    if (st.chatFor !== mode) {
      st.chat = [];
      renderChat();
      try {
        const r = await api('/api/sk/chat?mode=' + encodeURIComponent(mode));
        if (st.chatMode !== mode) return;
        st.chat = r.messages; st.chatFor = mode;
      } catch (e) { return toast(e.message, 'err'); }
    }
    renderChat();
    if (!st.chat.length && mode !== 'grammar' && !st.sending) send(null); // репетитор начинает первым
  }

  async function send(text) {
    const mode = st.chatMode;
    st.sending = mode;
    if (text) st.chat.push({ id: 'tmp', role: 'user', content: text, at: Date.now() });
    renderChat();
    try {
      const r = await api('/api/sk/chat', { method: 'POST', body: text ? { mode, text } : { mode, start: true } });
      if (st.chatMode === mode) {
        st.chat = st.chat.filter((m) => m.id !== 'tmp');
        if (r.user) st.chat.push(r.user);
        st.chat.push(r.reply);
        st.chatFor = mode;
      } else {
        st.chatFor = null; // ответ пришёл в другой режим — перечитаем при возврате
      }
      refreshMe();
    } catch (e) {
      toast(e.message, 'err');
      st.chat = st.chat.filter((m) => m.id !== 'tmp');
      if (text && $('#skChatInput') && !$('#skChatInput').value) $('#skChatInput').value = text;
    }
    st.sending = false;
    if (st.chatMode === mode) renderChat();
  }

  function parseReply(content) {
    try { return JSON.parse(content); } catch { return { sk: '', ru: content, fixes: [], tip: '' }; }
  }

  function renderChat() {
    const list = $('#skChatList');
    if (!list) return;
    let html = '';
    if (!st.chat.length && st.chatMode === 'grammar' && st.sending !== st.chatMode) {
      html = `<div class="sk-note">Например:</div><div class="sk-chips">${QUESTIONS.map((q) => `<button class="sk-chip-q sk-read" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
    }
    for (const m of st.chat) {
      if (m.role === 'user') {
        html += `<div class="msg mine"><div class="bubble sk-read">${esc(m.content)}</div></div>`;
        continue;
      }
      const r = parseReply(m.content);
      const fixes = (r.fixes || []).map((f) => `
        <div class="sk-fix">✏️ ${f.wrong ? `<s>${esc(f.wrong)}</s> → ` : ''}<b>${esc(f.right)}</b>${f.note ? `<div class="sk-fix-note">${esc(f.note)}</div>` : ''}</div>`).join('');
      html += `<div class="msg"><div class="bubble sk-ai sk-read">${fixes ? `<div class="sk-fixes">${fixes}</div>` : ''}${r.sk ? `<div class="sk-ai-sk">${esc(r.sk)} ${sayBtn(r.sk)}</div>` : ''}${r.ru ? `<div class="sk-ai-ru">${esc(r.ru)}</div>` : ''}${r.tip ? `<div class="sk-tip">💡 ${esc(r.tip)}</div>` : ''}</div></div>`;
    }
    if (st.sending === st.chatMode) html += '<div class="msg"><div class="bubble sk-typing">печатает…</div></div>';
    list.innerHTML = html;
    list.scrollTop = list.scrollHeight;
    list.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => send(b.dataset.q)));
  }

  return { open, load, updateBadge, speak };
})();
