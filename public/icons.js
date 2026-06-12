/* ===== icons.js — 20 пиксельных иконок в стиле Minecraft (SVG, рисуются из карт) ===== */
(function (global) {
  'use strict';

  // строит data:URI из пиксельной карты (16x16) и палитры символов
  function build(rows, pal) {
    const px = 4, W = 16;
    let rects = '';
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y];
      for (let x = 0; x < row.length; x++) {
        const c = row[x];
        if (c !== '.' && pal[c]) rects += `<rect x="${x * px}" y="${y * px}" width="${px}" height="${px}" fill="${pal[c]}"/>`;
      }
    }
    const size = W * px;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" shape-rendering="crispEdges" viewBox="0 0 ${size} ${size}">${rects}</svg>`;
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  const K = '#16161c'; // общий контур

  const ICONS = [];
  function add(name, rows, pal) { ICONS.push({ name, data: build(rows, pal) }); }

  // 1. Алмаз
  add('Алмаз', [
    '.......kk.......',
    '......kddk......',
    '.....kddddk.....',
    '....kddddddk....',
    '...kddddddddk...',
    '..kddddddddddk..',
    '..kdwddddddwdk..',
    '...kddddddddk...',
    '....kdddddk.....',
    '.....kdddk......',
    '......kdk.......',
    '.......k........',
  ], { k: K, d: '#36d3e6', w: '#d6fbff' });

  // 2. Изумруд
  add('Изумруд', [
    '.....kkkkk......',
    '....keeeeek.....',
    '...keeweeeek....',
    '..keeeweeeeek...',
    '..keeeeeeeeek...',
    '..keeweweweek...',
    '..keeeeeeeeek...',
    '...keeeweeek....',
    '....keeeeek.....',
    '.....kkkkk......',
  ], { k: K, e: '#2ecc71', w: '#bfffd8' });

  // 3. Золотой слиток
  add('Золото', [
    '................',
    '....kkkkkkkk....',
    '...kgggggggk....',
    '..kgggwggggk....',
    '..kgggggggggk...',
    '..kggggggggggk..',
    '..kggwgggggggk..',
    '...kgggggggggk..',
    '....kkkkkkkkkk..',
    '................',
  ], { k: K, g: '#f6c528', w: '#ffe899' });

  // 4. Железный слиток
  add('Железо', [
    '................',
    '....kkkkkkkk....',
    '...kiiiiiiik....',
    '..kiiwiiiiik....',
    '..kiiiiiiiiik...',
    '..kiiiiiiiiiik..',
    '..kiiwiiiiiiik..',
    '...kiiiiiiiiik..',
    '....kkkkkkkkkk..',
    '................',
  ], { k: K, i: '#cdd0d6', w: '#ffffff' });

  // 5. Меч
  add('Меч', [
    '............kk..',
    '...........kwk..',
    '..........kwbk..',
    '.........kwbk...',
    '........kwbk....',
    '.......kwbk.....',
    '......kwbk......',
    '.....kwbk.......',
    '....khbkh.......',
    '...khhk.h.......',
    '..khbk..........',
    '.khk............',
  ], { k: K, w: '#e6e9ef', b: '#9aa0ad', h: '#7a4a22' });

  // 6. Кирка
  add('Кирка', [
    '..kkk......kkk..',
    '.kiiikkkkkiiik..',
    'kiiiiiiiiiiiiik.',
    '.kkkkkkhkkkkkk..',
    '......khk.......',
    '......khk.......',
    '......khk.......',
    '......khk.......',
    '......khk.......',
    '......khk.......',
    '......kkk.......',
  ], { k: K, i: '#cdd0d6', h: '#7a4a22' });

  // 7. Топор
  add('Топор', [
    '....kkkkk.......',
    '...kiiiiik......',
    '..kiiiiiiik.kh..',
    '..kiiiiiikh.h...',
    '..kiiiiikh.h....',
    '...kiiikh.h.....',
    '....kkkh.h......',
    '......h.h.......',
    '.....h.h........',
    '....h.h.........',
    '...h.h..........',
    '..hh............',
  ], { k: K, i: '#cdd0d6', h: '#7a4a22' });

  // 8. Яблоко
  add('Яблоко', [
    '.......hh.......',
    '......hg........',
    '....kk.kk.......',
    '...krrrrrrk.....',
    '..krrwwrrrrk....',
    '..krrwrrrrrk....',
    '..krrrrrrrrk....',
    '..krrrrrrrrk....',
    '...krrrrrrk.....',
    '...krrrrrrk.....',
    '....krrrrk......',
    '.....kkkk.......',
  ], { k: K, r: '#e23b3b', w: '#ff9c9c', h: '#7a4a22', g: '#3fae4a' });

  // 9. Золотое яблоко
  add('Золотое яблоко', [
    '.......hh.......',
    '......hg........',
    '....kk.kk.......',
    '...kggggggk.....',
    '..kggwwggggk....',
    '..kggwgggggk....',
    '..kgggggggggk...',
    '..kggggggggk....',
    '...kggggggk.....',
    '...kggggggk.....',
    '....kggggk......',
    '.....kkkk.......',
  ], { k: K, g: '#f6c528', w: '#fff4c2', h: '#7a4a22' });

  // 10. Хлеб
  add('Хлеб', [
    '................',
    '...kkkkkkkkk....',
    '..kbbbbbbbbbk...',
    '.kbbwbbwbbwbbk..',
    '.kbbbbbbbbbbbk..',
    '.kbbwbbwbbwbbk..',
    '.kbbbbbbbbbbbk..',
    '..kbbbbbbbbbk...',
    '...kkkkkkkkk....',
    '................',
  ], { k: K, b: '#c98a3c', w: '#ffd98a' });

  // 11. Сердце
  add('Сердце', [
    '................',
    '..kkk....kkk....',
    '.krrrk..krrrk...',
    'krrwrrkkrrrrrk..',
    'krrwrrrrrrrrrk..',
    'krrrrrrrrrrrrk..',
    '.krrrrrrrrrrk...',
    '..krrrrrrrrk....',
    '...krrrrrrk.....',
    '....krrrrk......',
    '.....krrk.......',
    '......kk........',
  ], { k: K, r: '#e23b3b', w: '#ff9c9c' });

  // 12. Сундук
  add('Сундук', [
    '..kkkkkkkkkkk...',
    '.kwwwwwwwwwwwk..',
    '.kwbbbbbbbbbwk..',
    '.kwbbbbbbbbbwk..',
    '.kkkkkkmkkkkkk..',
    '.kwbbbbnbbbbwk..',
    '.kwbbbbmbbbbwk..',
    '.kwbbbbbbbbbwk..',
    '.kwwwwwwwwwwwk..',
    '.kkkkkkkkkkkk...',
  ], { k: K, b: '#9a5a22', w: '#7a4a1a', m: '#caa24a', n: '#3a3a3a' });

  // 13. Факел
  add('Факел', [
    '................',
    '.......ff.......',
    '......foof......',
    '......foof......',
    '.......kk.......',
    '.......hh.......',
    '.......hh.......',
    '.......hh.......',
    '.......hh.......',
    '.......hh.......',
    '.......hh.......',
  ], { k: K, f: '#ffd24a', o: '#ff8a1e', h: '#7a4a22' });

  // 14. Лук
  add('Лук', [
    '....kk..........',
    '...kwwk.........',
    '..kw..wk........',
    '..k....wk.......',
    '.kw.....k.s.....',
    '.kw.....ksss....',
    '.kw.....k.s.....',
    '..k....wk.......',
    '..kw..wk........',
    '...kwwk.........',
    '....kk..........',
  ], { k: K, w: '#7a4a22', s: '#cdd0d6' });

  // 15. Щит
  add('Щит', [
    '..kkkkkkkkkk....',
    '.kwwwwwwwwwwk...',
    '.kwbbbbbbbbwk...',
    '.kwbbbbbbbbwk...',
    '.kwbbwwwwbbwk...',
    '.kwbbwwwwbbwk...',
    '.kwbbbbbbbbwk...',
    '..kwbbbbbbwk....',
    '...kwbbbbwk.....',
    '....kwbbwk......',
    '.....kwwk.......',
    '......kk........',
  ], { k: K, w: '#9a5a22', b: '#c0c4cc' });

  // 16. Зелье
  add('Зелье', [
    '......kkk.......',
    '......khk.......',
    '......kkk.......',
    '.....k...k......',
    '....k.ppp.k.....',
    '...k.ppppp.k....',
    '...k.pwppp.k....',
    '...k.ppppp.k....',
    '...k.ppppp.k....',
    '....k.ppp.k.....',
    '.....kkkkk......',
  ], { k: K, p: '#c33bd6', w: '#f3b6ff', h: '#7a4a22' });

  // 17. TNT
  add('TNT', [
    '................',
    '.kkkkkkkkkkkk...',
    '.krrrrrrrrrrk...',
    '.krwwwwwwwwrk...',
    '.krwbbbbbbwrk...',
    '.krwbwbwbbwrk...',
    '.krwbbbbbbwrk...',
    '.krwbwbwbbwrk...',
    '.krwwwwwwwwrk...',
    '.krrrrrrrrrrk...',
    '.kkkkkkkkkkkk...',
  ], { k: K, r: '#d23a2a', w: '#efe7df', b: '#3a3a3a' });

  // 18. Звезда (нэзер-стар)
  add('Звезда', [
    '.......k........',
    '.......w........',
    '......kwk.......',
    '..k..kwwwk..k...',
    '...kkwwwwwkk....',
    '....kwwwwwk.....',
    '...kwwwwwwwk....',
    '..kwwk.k.kwwk...',
    '.kwk...k...kwk..',
    'kk.....k.....kk.',
  ], { k: K, w: '#f4f7ff' });

  // 19. Компас
  add('Компас', [
    '....kkkkkkk.....',
    '..kkwwwwwwwkk...',
    '.kwbbbbbbbbbwk..',
    '.kwbbbbrbbbbwk..',
    '.kwbbbrrrbbbwk..',
    '.kwbbbbrbbbbwk..',
    '.kwbbbbwbbbbwk..',
    '.kwbbbbbbbbbwk..',
    '..kkwwwwwwwkk...',
    '....kkkkkkk.....',
  ], { k: K, w: '#cdd0d6', b: '#2a2f3a', r: '#e23b3b' });

  // 20. Книга
  add('Книга', [
    '..kkkkkkkkkk....',
    '.kbbbbbbbbbbk...',
    '.kbwwwwwwwwbk...',
    '.kbwbbbbbbwbk...',
    '.kbwbbbbbbwbk...',
    '.kbwwwwwwwwbk...',
    '.kbwbbbbbbwbk...',
    '.kbwbbbbbbwbk...',
    '.kbwwwwwwwwbk...',
    '.kbbbbbbbbbbk...',
    '..kkkkkkkkkk....',
  ], { k: K, b: '#9a3b2e', w: '#efe7df' });

  // 21. Гантель
  add('Гантель', [
    '................',
    '.kk........kk...',
    'kmmk......kmmk..',
    'kmmkkkkkkkkmmk..',
    'kmmkhhhhhhkmmk..',
    'kmmkkkkkkkkmmk..',
    'kmmk......kmmk..',
    '.kk........kk...',
    '................',
  ], { k: K, m: '#cdd0d6', h: '#5a5f6a' });

  // 22. Кроссовок
  add('Кроссовок', [
    '................',
    '.....kkkk.......',
    '....kwwwwk......',
    '...kwbbbwwk.....',
    '..kwbbbbwwwk....',
    '.kwwwwwwwwwwk...',
    '.kwwwwwwwwwwk...',
    '.kkkkkkkkkkkk...',
    '..k.k.k.k.k.k...',
  ], { k: K, w: '#e6e9ef', b: '#3aa0e0' });

  // 23. Мозг
  add('Мозг', [
    '.....kkkk.......',
    '...kkppppkk.....',
    '..kpdpppdppk....',
    '..kpppppppppk...',
    '..kpdppdppppk...',
    '..kpppppppppk...',
    '...kppddpppk....',
    '....kkkkkkk.....',
  ], { k: K, p: '#f2a6c0', d: '#d76a93' });

  // 24. Монитор (ПК)
  add('Монитор', [
    '.kkkkkkkkkkk....',
    '.ksssssssssk....',
    '.ksgggggggsk....',
    '.ksgggggggsk....',
    '.ksgggggggsk....',
    '.kkkkkkkkkkk....',
    '.....kffk.......',
    '....kffffk......',
    '...kkkkkkkk.....',
  ], { k: K, s: '#2a2f3a', g: '#4ad0c0', f: '#7a7f8a' });

  // 25. Кисть
  add('Кисть', [
    '............kk..',
    '...........kmk..',
    '..........kmk...',
    '.........kmk....',
    '........khk.....',
    '.......khk......',
    '......khk.......',
    '.....krk........',
    '....krrk........',
    '...krrk.........',
    '..krk...........',
  ], { k: K, h: '#7a4a22', m: '#cdd0d6', r: '#e23b3b' });

  // 26. Нота
  add('Нота', [
    '.........kk.....',
    '.........knk....',
    '.........knk....',
    '.......kknnk....',
    '...kk..knnnk....',
    '..knnk.knnk.....',
    '..knnk.kk.......',
    '...kk...........',
  ], { k: K, n: '#3a3a45' });

  // 27. Самолёт
  add('Самолёт', [
    '.......k........',
    '.......wk.......',
    '......kwwk......',
    '.....kwwwwk.....',
    'kkkkwwwwwwwwkk..',
    '.kwwwwwwwwwwwk..',
    'kkkkwwwwwwwwkk..',
    '.....kwwwwk.....',
    '......kwwk......',
    '.......wk.......',
  ], { k: K, w: '#cdd0d6' });

  // 28. Кофе
  add('Кофе', [
    '......sss.......',
    '.....s...s......',
    '.kkkkkkkk.......',
    '.kwwwwwwk.s.....',
    '.kwccccwk.s.....',
    '.kwccccwkk......',
    '.kwccccwk.......',
    '.kwwwwwwk.......',
    '..kkkkkk........',
  ], { k: K, c: '#7a4a22', w: '#efe7df', s: '#9aa0ad' });

  // 29. Капля
  add('Капля', [
    '.......k........',
    '......kbk.......',
    '......kbk.......',
    '.....kbwbk......',
    '....kbwwwbk.....',
    '...kbwwwwwbk....',
    '...kbwwwwwbk....',
    '....kbbbbbk.....',
    '.....kkkk.......',
  ], { k: K, b: '#3bb0e6', w: '#bfeaff' });

  // 30. Росток
  add('Росток', [
    '.....kk....kk...',
    '....kggk..kggk..',
    '...kgggkkkgggk..',
    '....kggkgkggk...',
    '.......kgk......',
    '.......kdk......',
    '.......kdk......',
    '......kkkk......',
  ], { k: K, g: '#3fae4a', d: '#7a4a22' });

  // 31. Морковь
  add('Морковь', [
    '......kgk.......',
    '.....kgkgk......',
    '......kok.......',
    '.....koook......',
    '.....kooook.....',
    '......koook.....',
    '.......kook.....',
    '........kok.....',
    '.........k......',
  ], { k: K, o: '#e8821e', g: '#3fae4a' });

  // 32. Часы
  add('Часы', [
    '....kkkkkk......',
    '..kkwwwwwwkk....',
    '.kwwwwnwwwwwk...',
    '.kwwwwnwwwwwk...',
    '.kwwwwnnnwwwk...',
    '.kwwwwwwwwwwk...',
    '..kkwwwwwwkk....',
    '....kkkkkk......',
  ], { k: K, w: '#efe7df', n: '#2a2f3a' });

  // 33. Кубок
  add('Кубок', [
    '.kkkkkkkkkk.....',
    '.kgggggggggk....',
    'k.kggggggggk.k..',
    'k.kgggggggk.k...',
    '.k.kgggggk.k....',
    '...kgggggk......',
    '....kgggk.......',
    '...kgggggk......',
    '..kkkkkkkkk.....',
  ], { k: K, g: '#f6c528' });

  // 34. Корона
  add('Корона', [
    '.k.....k.....k..',
    '.kk...kgk...kk..',
    '.kgk.kgggk.kgk..',
    '.kgkkgggggkkgk..',
    '.kgggggggggggk..',
    '.kgrgggrgggrgk..',
    '.kgggggggggggk..',
    '.kkkkkkkkkkkkk..',
  ], { k: K, g: '#f6c528', r: '#e23b3b' });

  // 35. Крипер
  add('Крипер', [
    '.kkkkkkkkkk.....',
    '.kggggggggk.....',
    '.kgddggddgk.....',
    '.kgddggddgk.....',
    '.kgggddgggk.....',
    '.kggdddddgk.....',
    '.kggdddddgk.....',
    '.kggdkkdggk.....',
    '.kkkkkkkkkk.....',
  ], { k: K, g: '#5fae3a', d: '#1f1f1f' });

  global.MC_ICONS = ICONS;
})(window);
