/* ===== sound.js — синтез звуков через WebAudio (без файлов) ===== */
(function (global) {
  'use strict';

  const LS = 'ach_sound_on_v1';
  let enabled = (function () { try { const v = localStorage.getItem(LS); return v == null ? true : v === '1'; } catch (e) { return true; } })();
  let ctx = null;

  function ensureCtx() {
    if (!ctx) { try { ctx = new (global.AudioContext || global.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // одна нота
  function note(freq, start, dur, type, gain) {
    const c = ctx;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'square';      // square — «8-битный» тембр
    osc.frequency.value = freq;
    const t0 = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain || 0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(c.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  // мелодии/эффекты
  const SOUNDS = {
    click: () => note(440, 0, 0.05, 'square', 0.08),
    step: () => note(620, 0, 0.06, 'triangle', 0.1),
    complete: () => { note(660, 0, 0.1, 'square', 0.16); note(880, 0.09, 0.14, 'square', 0.16); },
    levelup: () => { [523, 659, 784, 1047].forEach((f, i) => note(f, i * 0.09, 0.16, 'square', 0.17)); },
    legendary: () => { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => note(f, i * 0.08, 0.2, 'square', 0.18)); note(1568, 0.5, 0.3, 'triangle', 0.14); },
    error: () => { note(180, 0, 0.12, 'sawtooth', 0.12); },
  };

  function play(name) {
    if (!enabled) return;
    const c = ensureCtx(); if (!c) return;
    const fn = SOUNDS[name]; if (fn) try { fn(); } catch (e) {}
  }

  function setEnabled(on) { enabled = !!on; try { localStorage.setItem(LS, on ? '1' : '0'); } catch (e) {} if (on) play('click'); }
  function isEnabled() { return enabled; }

  global.Sound = { play, setEnabled, isEnabled };
})(window);
