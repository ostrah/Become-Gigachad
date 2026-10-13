/* 🇸🇰 Словацкий с нуля — содержимое курса (A0 → A1).
   Общий файл: в браузере → window.SK_COURSE, на сервере → require().
   Каждая тема: theory (HTML), words [sk, ru, заметка?], phrases [sk, ru].
   Ключ карточки для повторения — само словацкое слово (sk), поэтому
   одно и то же слово в разных темах — одна карточка. */
(function (root) {
  'use strict';

  const UNITS = [
    {
      id: 'u01', emoji: '🔤', title: 'Звуки и буквы',
      theory: `
<p>Хорошая новость: словацкий читается <b>почти так, как пишется</b>, а ударение <b>всегда на первом слоге</b>: <i>DOb­rý deň, SLO­ven­sko, PRA­cu­jem</i>.</p>
<h4>Долгие гласные</h4>
<p>Чёрточка над гласной (<b>dĺžeň</b>) — это не ударение, а <b>долгота</b>: звук тянется в два раза дольше. <i>á é í ó ú ý</i>. Долгота меняет смысл: <i>sud</i> (бочка) ≠ <i>súd</i> (суд).</p>
<h4>Особые буквы</h4>
<table>
<tr><td><b>č</b></td><td>ч</td><td>čaj — чай</td></tr>
<tr><td><b>š</b></td><td>ш</td><td>škola — школа</td></tr>
<tr><td><b>ž</b></td><td>ж</td><td>žena — женщина</td></tr>
<tr><td><b>c</b></td><td>ц</td><td>ulica — улица</td></tr>
<tr><td><b>ch</b></td><td>х</td><td>chlieb — хлеб</td></tr>
<tr><td><b>h</b></td><td>г (украинское, с придыханием)</td><td>hlava — голова</td></tr>
<tr><td><b>ď ť ň ľ</b></td><td>дь, ть, нь, ль</td><td>ďakujem — спасибо</td></tr>
<tr><td><b>ä</b></td><td>э (в разговоре — почти «е»)</td><td>päť — пять</td></tr>
<tr><td><b>ô</b></td><td>уо (одним слогом)</td><td>kôň — конь</td></tr>
<tr><td><b>ia ie iu</b></td><td>я, е, ю (дифтонги)</td><td>mlieko — молоко</td></tr>
<tr><td><b>y / ý</b></td><td>и (как обычное «и»)</td><td>syn — сын</td></tr>
<tr><td><b>dz, dž</b></td><td>дз, дж — один звук</td><td>medzi — между</td></tr>
</table>
<h4>Мягкость</h4>
<p>Сочетания <b>de, te, ne, le, di, ti, ni, li</b> в обычных словах читаются мягко: <i>deti</i> = «дети», <i>nie</i> = «ние». Перед <b>y</b> — твёрдо: <i>ty</i> = «ты».</p>
<h4>Буквы r и l без гласных</h4>
<p>В словацком <b>r</b> и <b>l</b> могут быть «гласными»: <i>krk</i> (шея), <i>vlk</i> (волк), <i>prst</i> (палец), <i>Trnava</i>. Просто произнеси их чуть дольше.</p>
<p>👉 Нажимай 🔊 у каждого слова и повторяй вслух — это главный способ поставить произношение.</p>`,
      words: [
        ['áno', 'да'], ['nie', 'нет'], ['a', 'и'], ['ale', 'но'], ['alebo', 'или'],
        ['čo', 'что'], ['kto', 'кто'], ['prečo', 'почему'], ['tu', 'здесь'], ['tam', 'там'],
        ['muž', 'мужчина'], ['žena', 'женщина'],
      ],
      phrases: [
        ['Áno, tu.', 'Да, здесь.'],
        ['Nie, tam.', 'Нет, там.'],
        ['Kto je to?', 'Кто это?'],
        ['Čo je to?', 'Что это?'],
        ['To je muž a to je žena.', 'Это мужчина, а это женщина.'],
      ],
    },

    {
      id: 'u02', emoji: '👋', title: 'Приветствия и вежливость',
      theory: `
<h4>Ты и вы</h4>
<p>Как и в русском, на «ты» — с друзьями, детьми, ровесниками в неформальной обстановке. С незнакомыми и старшими — на <b>«vy»</b>.</p>
<table>
<tr><td><b>Ahoj!</b> / <b>Čau!</b></td><td>Привет! / Пока! (на «ты»)</td></tr>
<tr><td><b>Dobrý deň!</b></td><td>Здравствуйте! (весь день)</td></tr>
<tr><td><b>Dovidenia!</b></td><td>До свидания!</td></tr>
<tr><td><b>Ako sa máš?</b></td><td>Как дела? (ты)</td></tr>
<tr><td><b>Ako sa máte?</b></td><td>Как дела? (вы)</td></tr>
</table>
<h4>Волшебное слово «Prosím»</h4>
<p><b>Prosím</b> — это и «пожалуйста» (просьба), и «пожалуйста» в ответ на «спасибо», и «слушаю» по телефону, и «что-что? повторите». А когда <i>что-то протягиваешь</i> — говорят <b>Nech sa páči</b> («вот, пожалуйста»).</p>
<h4>⚠️ Ложные друзья</h4>
<p><b>pozor</b> — внимание (а не позор), <b>čerstvý</b> — свежий (а не чёрствый), <b>zápach</b> — вонь, а приятный запах — <b>vôňa</b>, <b>úžasný</b> — потрясающий (а не ужасный).</p>`,
      words: [
        ['Ahoj', 'привет / пока'], ['Čau', 'привет / пока (разг.)'],
        ['Dobrý deň', 'здравствуйте (добрый день)'], ['Dobré ráno', 'доброе утро'],
        ['Dobrý večer', 'добрый вечер'], ['Dobrú noc', 'спокойной ночи'],
        ['Dovidenia', 'до свидания'], ['Ďakujem', 'спасибо'], ['Prosím', 'пожалуйста'],
        ['Prepáčte', 'извините'], ['Nech sa páči', 'вот, пожалуйста (протягивая)'],
        ['Ako sa máš?', 'как дела? (ты)'], ['Ako sa máte?', 'как дела? (вы)'],
        ['Mám sa dobre', 'у меня всё хорошо'], ['Teší ma', 'приятно познакомиться'],
      ],
      phrases: [
        ['Dobrý deň, ako sa máte?', 'Здравствуйте, как у вас дела?'],
        ['Ďakujem, mám sa dobre.', 'Спасибо, у меня всё хорошо.'],
        ['Ahoj, ako sa máš?', 'Привет, как дела?'],
        ['Prepáčte, nerozumiem.', 'Извините, я не понимаю.'],
        ['Dovidenia a ďakujem!', 'До свидания и спасибо!'],
      ],
    },

    {
      id: 'u03', emoji: '🙋', title: 'Знакомство · глагол «byť»',
      theory: `
<h4>Глагол byť — быть</h4>
<p>В отличие от русского, «быть» в настоящем времени <b>всегда произносится</b>: не «я студент», а «я <b>есть</b> студент» — <i>som študent</i>.</p>
<table>
<tr><td>ja <b>som</b></td><td>я (есть)</td><td>my <b>sme</b></td><td>мы</td></tr>
<tr><td>ty <b>si</b></td><td>ты</td><td>vy <b>ste</b></td><td>вы</td></tr>
<tr><td>on/ona/ono <b>je</b></td><td>он/она/оно</td><td>oni <b>sú</b></td><td>они</td></tr>
</table>
<p>Местоимения обычно <b>опускают</b>: форма глагола и так показывает, кто: <i>Som z Ruska</i> — «Я из России».</p>
<h4>Отрицание</h4>
<p>У «byť» отрицание пишется <b>отдельно</b>: <i>nie som, nie si, nie je, nie sme, nie ste, nie sú</i>. У всех остальных глаголов — <b>слитно</b> с <i>ne-</i>: <i>nerozumiem</i> (не понимаю).</p>
<h4>Как представиться</h4>
<p><b>Volám sa Alex.</b> — Меня зовут Алекс (букв. «я зовусь»). <b>Ako sa voláš?</b> — Как тебя зовут?</p>
<p>Откуда: <b>z</b> + страна в родительном падеже: <i>z Ruska, z Ukrajiny, z Česka</i>. Перед s/z/š/ž предлог становится <b>zo</b>: <i>zo Slovenska</i>.</p>`,
      words: [
        ['ja', 'я'], ['ty', 'ты'], ['on', 'он'], ['ona', 'она'], ['my', 'мы'], ['vy', 'вы'], ['oni', 'они'],
        ['som', '(я) есть'], ['Volám sa …', 'меня зовут …'], ['Ako sa voláš?', 'как тебя зовут?'],
        ['Odkiaľ si?', 'откуда ты?'], ['Som z Ruska', 'я из России'], ['Som z Ukrajiny', 'я из Украины'],
        ['Bývam v Bratislave', 'я живу в Братиславе'],
      ],
      phrases: [
        ['Volám sa Alex. A ty?', 'Меня зовут Алекс. А тебя?'],
        ['Som z Ruska, ale bývam na Slovensku.', 'Я из России, но живу в Словакии.'],
        ['Ona je zo Slovenska.', 'Она из Словакии.'],
        ['My sme priatelia.', 'Мы друзья.'],
        ['Nie som Slovák.', 'Я не словак.'],
        ['Teší ma, ja som Peter.', 'Приятно познакомиться, я Петер.'],
      ],
    },

    {
      id: 'u04', emoji: '🔢', title: 'Числа',
      theory: `
<table>
<tr><td>0 nula</td><td>5 päť</td><td>10 desať</td><td>15 pätnásť</td></tr>
<tr><td>1 jeden</td><td>6 šesť</td><td>11 jedenásť</td><td>16 šestnásť</td></tr>
<tr><td>2 dva</td><td>7 sedem</td><td>12 dvanásť</td><td>17 sedemnásť</td></tr>
<tr><td>3 tri</td><td>8 osem</td><td>13 trinásť</td><td>18 osemnásť</td></tr>
<tr><td>4 štyri</td><td>9 deväť</td><td>14 štrnásť</td><td>19 devätnásť</td></tr>
</table>
<p>Десятки: <i>20 dvadsať, 30 tridsať, 40 štyridsať, 50 päťdesiat, 60 šesťdesiat, 70 sedemdesiat, 80 osemdesiat, 90 deväťdesiat</i>. <b>100 sto, 1000 tisíc</b>.</p>
<p>Составные пишутся слитно: <i>25 = dvadsaťpäť</i>, <i>21 = dvadsaťjeden</i>.</p>
<h4>Род у «1» и «2»</h4>
<p><b>jeden</b> muž, <b>jedna</b> žena, <b>jedno</b> pivo · <b>dva</b> muži, <b>dve</b> ženy, <b>dve</b> pivá.</p>
<h4>Возраст</h4>
<p>Как в русском — через «иметь»: <i>Mám 25 rokov</i> (букв. «имею 25 лет»). <i>Koľko máš rokov?</i> — Сколько тебе лет?</p>`,
      words: [
        ['nula', 'ноль'], ['jeden', 'один'], ['dva', 'два'], ['tri', 'три'], ['štyri', 'четыре'],
        ['päť', 'пять'], ['šesť', 'шесть'], ['sedem', 'семь'], ['osem', 'восемь'], ['deväť', 'девять'],
        ['desať', 'десять'], ['dvadsať', 'двадцать'], ['sto', 'сто'], ['Koľko?', 'сколько?'],
      ],
      phrases: [
        ['Mám dvadsaťpäť rokov.', 'Мне двадцать пять лет.'],
        ['Koľko máš rokov?', 'Сколько тебе лет?'],
        ['To stojí desať eur.', 'Это стоит десять евро.'],
        ['Dva čaje, prosím.', 'Два чая, пожалуйста.'],
        ['Mám jedného brata.', 'У меня один брат.'],
      ],
    },

    {
      id: 'u05', emoji: '👨‍👩‍👧', title: 'Семья · глагол «mať»',
      theory: `
<h4>Глагол mať — иметь</h4>
<p>По-словацки не «у меня есть», а «я имею»: <i>Mám brata</i> — у меня есть брат.</p>
<table>
<tr><td>(ja) <b>mám</b></td><td>(my) <b>máme</b></td></tr>
<tr><td>(ty) <b>máš</b></td><td>(vy) <b>máte</b></td></tr>
<tr><td>(on/ona) <b>má</b></td><td>(oni) <b>majú</b></td></tr>
</table>
<p>Отрицание слитно: <b>nemám</b> — у меня нет.</p>
<h4>Мой, твой…</h4>
<table>
<tr><td></td><td>муж. р.</td><td>жен. р.</td><td>ср. р. / мн.</td></tr>
<tr><td>мой</td><td>môj otec</td><td>moja mama</td><td>moje dieťa</td></tr>
<tr><td>твой</td><td>tvoj brat</td><td>tvoja sestra</td><td>tvoje deti</td></tr>
<tr><td>наш</td><td>náš syn</td><td>naša dcéra</td><td>naše deti</td></tr>
</table>
<p><i>jeho</i> — его, <i>jej</i> — её, <i>ich</i> — их (не меняются).</p>
<p>В разговоре бабушку и дедушку чаще зовут <b>babka</b> и <b>dedko</b>.</p>`,
      words: [
        ['rodina', 'семья'], ['mama', 'мама'], ['otec', 'отец'], ['brat', 'брат'], ['sestra', 'сестра'],
        ['syn', 'сын'], ['dcéra', 'дочь'], ['manžel', 'муж'], ['manželka', 'жена'], ['dieťa', 'ребёнок'],
        ['deti', 'дети'], ['starý otec', 'дедушка'], ['stará mama', 'бабушка'], ['mať', 'иметь'],
      ],
      phrases: [
        ['Mám brata a sestru.', 'У меня есть брат и сестра.'],
        ['Toto je moja mama.', 'Это моя мама.'],
        ['Môj otec je lekár.', 'Мой отец — врач.'],
        ['Máš deti?', 'У тебя есть дети?'],
        ['Nemám deti.', 'У меня нет детей.'],
        ['Moja sestra býva v Košiciach.', 'Моя сестра живёт в Кошице.'],
      ],
    },

    {
      id: 'u06', emoji: '🍽', title: 'Еда и напитки',
      theory: `
<h4>Как заказать</h4>
<table>
<tr><td><b>Chcem …</b></td><td>я хочу … (прямолинейно)</td></tr>
<tr><td><b>Chcel by som …</b> (муж.) / <b>Chcela by som …</b> (жен.)</td><td>я бы хотел(а) … — вежливо</td></tr>
<tr><td><b>Dám si …</b></td><td>я возьму … — самый частый вариант в кафе</td></tr>
<tr><td><b>Prosím si …</b></td><td>мне, пожалуйста, …</td></tr>
</table>
<h4>Винительный падеж (кого? что?)</h4>
<p>Женские слова на <b>-a</b> меняют окончание на <b>-u</b>: <i>káva → Dám si kávu</i>, <i>voda → Prosím si vodu</i>, <i>polievka → polievku</i>. Как в русском: «вода → воду».</p>
<p>Неодушевлённые мужские и средние не меняются: <i>Dám si čaj, pivo, syr</i>.</p>
<p>⚠️ <b>Káva</b> — женского рода: <i>dobrá káva</i>. <br>🍲 Национальное блюдо — <b>bryndzové halušky</b> (клёцки с овечьим сыром).</p>`,
      words: [
        ['voda', 'вода'], ['káva', 'кофе'], ['čaj', 'чай'], ['pivo', 'пиво'], ['víno', 'вино'],
        ['mlieko', 'молоко'], ['chlieb', 'хлеб'], ['mäso', 'мясо'], ['ryba', 'рыба'], ['polievka', 'суп'],
        ['syr', 'сыр'], ['zelenina', 'овощи'], ['ovocie', 'фрукты'], ['jablko', 'яблоко'],
        ['raňajky', 'завтрак'], ['obed', 'обед'], ['večera', 'ужин'],
      ],
      phrases: [
        ['Chcel by som kávu, prosím.', 'Я бы хотел кофе, пожалуйста.'],
        ['Dám si pivo.', 'Я возьму пиво.'],
        ['Mám hlad.', 'Я голоден.'],
        ['Mám smäd.', 'Я хочу пить.'],
        ['To je veľmi dobré.', 'Это очень вкусно.'],
        ['Nejem mäso.', 'Я не ем мясо.'],
      ],
    },

    {
      id: 'u07', emoji: '🛒', title: 'В кафе и магазине',
      theory: `
<h4>Сколько стоит?</h4>
<p><b>Koľko to stojí?</b> — Сколько это стоит? Ответ: <i>To stojí …</i></p>
<h4>Евро и центы — как в русском «1 рубль, 2 рубля, 5 рублей»</h4>
<table>
<tr><td>1</td><td>jedno <b>euro</b></td><td>jeden <b>cent</b></td></tr>
<tr><td>2–4</td><td>dve/tri <b>eurá</b></td><td>dva/tri <b>centy</b></td></tr>
<tr><td>5+</td><td>päť <b>eur</b></td><td>päť <b>centov</b></td></tr>
</table>
<h4>Оплата</h4>
<p><i>platiť <b>kartou</b></i> — платить картой, <i>platiť <b>v hotovosti</b></i> — наличными. <b>Účet, prosím!</b> — Счёт, пожалуйста!</p>
<p>Продавец часто спросит <b>«Ešte niečo?»</b> (Что-нибудь ещё?) — отвечай <b>«Nie, to je všetko, ďakujem.»</b></p>`,
      words: [
        ['Koľko to stojí?', 'сколько это стоит?'], ['euro', 'евро'], ['lacný', 'дешёвый'], ['drahý', 'дорогой'],
        ['obchod', 'магазин'], ['kaviareň', 'кафе'], ['reštaurácia', 'ресторан'], ['účet', 'счёт'],
        ['platiť', 'платить'], ['kartou', 'картой'], ['v hotovosti', 'наличными'],
        ['Účet, prosím.', 'счёт, пожалуйста'], ['Ešte niečo?', 'что-нибудь ещё?'], ['To je všetko.', 'это всё'],
      ],
      phrases: [
        ['Prosím si jednu kávu s mliekom.', 'Мне, пожалуйста, один кофе с молоком.'],
        ['Koľko stojí tento chlieb?', 'Сколько стоит этот хлеб?'],
        ['Môžem platiť kartou?', 'Можно оплатить картой?'],
        ['Zaplatím v hotovosti.', 'Я заплачу наличными.'],
        ['Je to príliš drahé.', 'Это слишком дорого.'],
        ['Nie, to je všetko, ďakujem.', 'Нет, это всё, спасибо.'],
      ],
    },

    {
      id: 'u08', emoji: '🎨', title: 'Род и прилагательные',
      theory: `
<h4>Три рода — как в русском</h4>
<table>
<tr><td>мужской</td><td>на согласную</td><td>dom, stôl, pes</td></tr>
<tr><td>женский</td><td>обычно на <b>-a</b></td><td>žena, káva, ulica</td></tr>
<tr><td>средний</td><td>на <b>-o, -e, -ie</b></td><td>mesto, more, námestie</td></tr>
</table>
<h4>Окончания прилагательных</h4>
<table>
<tr><td>nov<b>ý</b> dom</td><td>nov<b>á</b> káva</td><td>nov<b>é</b> auto</td></tr>
<tr><td>ten — этот</td><td>tá — эта</td><td>to — это</td></tr>
</table>
<h4>Ритмическое правило</h4>
<p>В словацком два долгих слога подряд «не любят»: если в корне долгий слог (á, í, ie, ô…), окончание становится <b>коротким</b>: <i>biel<b>y</b></i> (не bielý), <i>krásn<b>y</b> dom, krásn<b>a</b> žena, krásn<b>e</b> mesto</i>.</p>`,
      words: [
        ['veľký', 'большой'], ['malý', 'маленький'], ['dobrý', 'хороший'], ['zlý', 'плохой'],
        ['nový', 'новый'], ['starý', 'старый'], ['pekný', 'красивый'], ['červený', 'красный'],
        ['modrý', 'синий'], ['zelený', 'зелёный'], ['biely', 'белый'], ['čierny', 'чёрный'],
        ['žltý', 'жёлтый'], ['dom', 'дом'], ['auto', 'машина'],
      ],
      phrases: [
        ['To je nový dom.', 'Это новый дом.'],
        ['Mám červené auto.', 'У меня красная машина.'],
        ['Bratislava je pekné mesto.', 'Братислава — красивый город.'],
        ['Táto káva je veľmi dobrá.', 'Этот кофе очень хороший.'],
        ['Ten pes je veľký.', 'Эта собака большая.'],
      ],
    },

    {
      id: 'u09', emoji: '⚙️', title: 'Глаголы: настоящее время',
      theory: `
<h4>Три главных типа спряжения</h4>
<table>
<tr><td></td><td>-ám<br><i>volať</i></td><td>-ím<br><i>robiť</i></td><td>-em<br><i>pracovať</i></td></tr>
<tr><td>ja</td><td>vol<b>ám</b></td><td>rob<b>ím</b></td><td>pracuj<b>em</b></td></tr>
<tr><td>ty</td><td>vol<b>áš</b></td><td>rob<b>íš</b></td><td>pracuj<b>eš</b></td></tr>
<tr><td>on/ona</td><td>vol<b>á</b></td><td>rob<b>í</b></td><td>pracuj<b>e</b></td></tr>
<tr><td>my</td><td>vol<b>áme</b></td><td>rob<b>íme</b></td><td>pracuj<b>eme</b></td></tr>
<tr><td>vy</td><td>vol<b>áte</b></td><td>rob<b>íte</b></td><td>pracuj<b>ete</b></td></tr>
<tr><td>oni</td><td>vol<b>ajú</b></td><td>rob<b>ia</b></td><td>pracuj<b>ú</b></td></tr>
</table>
<h4>Неправильные — выучи наизусть</h4>
<p><b>ísť</b> (идти/ехать): idem, ideš, ide, ideme, idete, idú<br>
<b>chcieť</b> (хотеть): chcem, chceš, chce, chceme, chcete, chcú<br>
<b>jesť</b> (есть): jem, ješ, je, jeme, jete, jedia<br>
<b>vedieť</b> (знать, уметь): viem, vieš, vie, vieme, viete, vedia</p>
<p><b>Učiť sa</b> — учиться/учить: <i>Učím sa slovenčinu</i>. Частица <b>sa</b> стоит на втором месте в предложении.</p>`,
      words: [
        ['robiť', 'делать'], ['pracovať', 'работать'], ['bývať', 'жить (проживать)'], ['hovoriť', 'говорить'],
        ['rozumieť', 'понимать'], ['vedieť', 'знать, уметь'], ['chcieť', 'хотеть'], ['ísť', 'идти, ехать'],
        ['piť', 'пить'], ['jesť', 'есть (кушать)'], ['čítať', 'читать'], ['učiť sa', 'учиться'],
        ['spať', 'спать'], ['vidieť', 'видеть'],
      ],
      phrases: [
        ['Hovoríš po slovensky?', 'Ты говоришь по-словацки?'],
        ['Hovorím trochu po slovensky.', 'Я немного говорю по-словацки.'],
        ['Učím sa slovenčinu.', 'Я учу словацкий язык.'],
        ['Nerozumiem. Môžete to zopakovať?', 'Не понимаю. Можете повторить?'],
        ['Kde pracuješ?', 'Где ты работаешь?'],
        ['Pracujem v kancelárii.', 'Я работаю в офисе.'],
        ['Neviem.', 'Я не знаю.'],
      ],
    },

    {
      id: 'u10', emoji: '🕐', title: 'Время и дни недели',
      theory: `
<h4>«В понедельник»</h4>
<p>v pondelok · v utorok · v <b>stredu</b> · <b>vo</b> štvrtok · v piatok · v <b>sobotu</b> · v <b>nedeľu</b></p>
<p>Женские дни (streda, sobota, nedeľa) меняют <b>-a → -u</b>, как в русском «в среду». Перед «št» предлог становится <b>vo</b>.</p>
<h4>Который час?</h4>
<table>
<tr><td><b>Koľko je hodín?</b></td><td>Который час?</td></tr>
<tr><td>Je jedna hodina.</td><td>Час.</td></tr>
<tr><td>Sú dve / tri / štyri hodiny.</td><td>Два / три / четыре часа.</td></tr>
<tr><td>Je päť hodín.</td><td>Пять часов.</td></tr>
</table>
<p>Обрати внимание: с 2–4 глагол <b>sú</b> (они есть), с 5+ — <b>je</b> (единственное число).</p>
<p><i>dnes</i> — сегодня, <i>zajtra</i> — завтра, <i>včera</i> — вчера, <i>ráno</i> — утром, <i>večer</i> — вечером.</p>`,
      words: [
        ['pondelok', 'понедельник'], ['utorok', 'вторник'], ['streda', 'среда'], ['štvrtok', 'четверг'],
        ['piatok', 'пятница'], ['sobota', 'суббота'], ['nedeľa', 'воскресенье'], ['dnes', 'сегодня'],
        ['zajtra', 'завтра'], ['včera', 'вчера'], ['ráno', 'утро, утром'], ['večer', 'вечер, вечером'],
        ['týždeň', 'неделя'], ['hodina', 'час'], ['Koľko je hodín?', 'который час?'],
      ],
      phrases: [
        ['Dnes je pondelok.', 'Сегодня понедельник.'],
        ['Zajtra nepracujem.', 'Завтра я не работаю.'],
        ['Sú tri hodiny.', 'Три часа.'],
        ['V sobotu idem do kina.', 'В субботу я иду в кино.'],
        ['Uvidíme sa v piatok.', 'Увидимся в пятницу.'],
      ],
    },

    {
      id: 'u11', emoji: '🗺', title: 'Город и дорога',
      theory: `
<h4>Где? Куда? Откуда?</h4>
<table>
<tr><td><b>Kde?</b></td><td>где?</td><td>v meste, na stanici</td></tr>
<tr><td><b>Kam?</b></td><td>куда?</td><td>do mesta, do práce</td></tr>
<tr><td><b>Odkiaľ?</b></td><td>откуда?</td><td>z mesta, z práce</td></tr>
</table>
<p>«Куда» обычно через <b>do</b> + родительный падеж: <i>idem do obchodu, do školy, do Košíc</i>.</p>
<h4>Транспорт</h4>
<p>На чём едем — творительный падеж без предлога: <i>idem <b>autobusom</b>, <b>vlakom</b>, <b>električkou</b></i>. Пешком — <b>pešo</b>.</p>
<h4>Направления</h4>
<p><b>vľavo</b> — налево, <b>vpravo</b> — направо, <b>rovno</b> — прямо. Вежливая просьба к незнакомому: <i>Choďte rovno</i> — идите прямо.</p>`,
      words: [
        ['mesto', 'город'], ['ulica', 'улица'], ['námestie', 'площадь'], ['stanica', 'вокзал, станция'],
        ['autobus', 'автобус'], ['električka', 'трамвай'], ['vlak', 'поезд'], ['lístok', 'билет'],
        ['vľavo', 'налево'], ['vpravo', 'направо'], ['rovno', 'прямо'], ['blízko', 'близко'],
        ['ďaleko', 'далеко'], ['Kde je …?', 'где …?'], ['záchod', 'туалет'],
      ],
      phrases: [
        ['Prepáčte, kde je stanica?', 'Извините, где вокзал?'],
        ['Choďte rovno a potom vpravo.', 'Идите прямо, а потом направо.'],
        ['Je to ďaleko?', 'Это далеко?'],
        ['Jeden lístok do Košíc, prosím.', 'Один билет до Кошице, пожалуйста.'],
        ['Idem do práce autobusom.', 'Я еду на работу на автобусе.'],
        ['Kde je záchod?', 'Где туалет?'],
      ],
    },

    {
      id: 'u12', emoji: '🩺', title: 'Здоровье и тело',
      theory: `
<h4>«У меня болит»</h4>
<p>Конструкция — «болит меня»: <b>Bolí ma hlava</b> (болит голова). Если болит несколько — <b>Bolia ma nohy</b> (болят ноги).</p>
<p><b>Som chorý</b> (муж.) / <b>Som chorá</b> (жен.) — я болен / больна.</p>
<h4>Экстренные номера в Словакии</h4>
<p><b>112</b> — единый номер экстренных служб, <b>155</b> — скорая помощь, <b>158</b> — полиция, <b>150</b> — пожарные.</p>
<p><b>Pomoc!</b> — Помогите! · <b>Zavolajte sanitku!</b> — Вызовите скорую!</p>
<p>Лекарства продают в <b>lekáreň</b> (аптека). Врач — <b>lekár</b>, больница — <b>nemocnica</b>.</p>`,
      words: [
        ['hlava', 'голова'], ['ruka', 'рука'], ['noha', 'нога'], ['oko', 'глаз'], ['zub', 'зуб'],
        ['brucho', 'живот'], ['lekár', 'врач'], ['lekáreň', 'аптека'], ['nemocnica', 'больница'],
        ['chorý', 'больной'], ['Bolí ma …', 'у меня болит …'], ['liek', 'лекарство'],
        ['teplota', 'температура'], ['Pomoc!', 'помогите!'], ['Zavolajte sanitku!', 'вызовите скорую!'],
      ],
      phrases: [
        ['Bolí ma hlava.', 'У меня болит голова.'],
        ['Potrebujem lekára.', 'Мне нужен врач.'],
        ['Kde je najbližšia lekáreň?', 'Где ближайшая аптека?'],
        ['Som chorý, mám teplotu.', 'Я болен, у меня температура.'],
        ['Bolí ma zub.', 'У меня болит зуб.'],
      ],
    },

    {
      id: 'u13', emoji: '💼', title: 'Работа, учёба, хобби',
      theory: `
<h4>«Люблю» — два способа</h4>
<table>
<tr><td><b>rád / rada</b> + глагол</td><td>люблю что-то делать</td><td><i>Rád čítam.</i> — Люблю читать.</td></tr>
<tr><td><b>mám rád / rada</b> + существительное</td><td>люблю что-то/кого-то</td><td><i>Mám rada hudbu.</i> — Я (ж) люблю музыку.</td></tr>
</table>
<p><b>rád</b> — говорит мужчина, <b>rada</b> — женщина, <b>radi</b> — мы/вы/они.</p>
<p>Обрати внимание: глагол после <i>rád</i> стоит в <b>личной форме</b> (čítam), а не в инфинитиве, как в русском «люблю читать».</p>
<h4>Профессии</h4>
<p>Часто есть мужская и женская форма: <i>študent / študentka, lekár / lekárka, učiteľ / učiteľka</i>.</p>`,
      words: [
        ['práca', 'работа'], ['škola', 'школа'], ['univerzita', 'университет'], ['študent', 'студент'],
        ['firma', 'фирма'], ['šéf', 'начальник'], ['kolega', 'коллега'], ['voľný čas', 'свободное время'],
        ['šport', 'спорт'], ['hudba', 'музыка'], ['futbal', 'футбол'], ['cestovať', 'путешествовать'],
        ['variť', 'готовить (еду)'], ['rád', 'охотно (люблю + глагол)'],
      ],
      phrases: [
        ['Rád cestujem.', 'Я люблю путешествовать.'],
        ['Mám rada hudbu.', 'Я (ж) люблю музыку.'],
        ['Čo robíš vo voľnom čase?', 'Что ты делаешь в свободное время?'],
        ['Som študent.', 'Я студент.'],
        ['Môj šéf je veľmi milý.', 'Мой начальник очень милый.'],
        ['Hráme futbal v nedeľu.', 'Мы играем в футбол в воскресенье.'],
      ],
    },

    {
      id: 'u14', emoji: '⏳', title: 'Прошедшее время',
      theory: `
<h4>Формула: «л-форма» + byť</h4>
<p>Почти как в русском (делал, делала), но в 1-м и 2-м лице добавляется вспомогательное <b>som / si / sme / ste</b>:</p>
<table>
<tr><td>ja</td><td>robil <b>som</b> / robila <b>som</b></td><td>my</td><td>robili <b>sme</b></td></tr>
<tr><td>ty</td><td>robil <b>si</b> / robila <b>si</b></td><td>vy</td><td>robili <b>ste</b></td></tr>
<tr><td>on / ona</td><td>robil / robila</td><td>oni</td><td>robili</td></tr>
</table>
<p>В 3-м лице вспомогательного нет: <i>On robil</i> — он делал.</p>
<p>Вспомогательный глагол стоит <b>на втором месте</b> в предложении: <i>Včera <b>som</b> bol doma</i>, <i>Čo <b>si</b> robil?</i></p>
<p>Неправильные: <b>byť → bol</b>, <b>ísť → išiel / išla</b>, <b>jesť → jedol</b>. Отрицание слитно: <i>nerobil som</i>.</p>`,
      words: [
        ['bol som', 'я был'], ['bola som', 'я была'], ['robil som', 'я делал'], ['videl som', 'я видел'],
        ['išiel som', 'я ходил / ездил'], ['mal som', 'у меня был'], ['minulý týždeň', 'на прошлой неделе'],
        ['pred rokom', 'год назад'], ['už', 'уже'], ['ešte nie', 'ещё нет'], ['víkend', 'выходные'],
      ],
      phrases: [
        ['Včera som bol v Bratislave.', 'Вчера я был в Братиславе.'],
        ['Čo si robil cez víkend?', 'Что ты делал на выходных?'],
        ['Videla som pekný film.', 'Я (ж) посмотрела хороший фильм.'],
        ['Ešte som nejedol.', 'Я ещё не ел.'],
        ['Minulý týždeň sme išli do Tatier.', 'На прошлой неделе мы ездили в Татры.'],
      ],
    },

    {
      id: 'u15', emoji: '🚀', title: 'Будущее, погода, планы',
      theory: `
<h4>Будущее время</h4>
<p>Как в русском «буду делать»: <b>budem + инфинитив</b>.</p>
<table>
<tr><td>budem</td><td>budeme</td></tr>
<tr><td>budeš</td><td>budete</td></tr>
<tr><td>bude</td><td>budú</td></tr>
</table>
<p><i>Zajtra budem pracovať</i> — завтра буду работать. <i>Budem doma</i> — буду дома.</p>
<p>Совершенный вид, как и в русском, сам означает будущее: <i>urobím</i> — сделаю, <i>zavolám</i> — позвоню. Глагол движения: <b>pôjdem</b> — пойду/поеду.</p>
<h4>Погода</h4>
<p><b>Prší</b> — идёт дождь, <b>sneží</b> — идёт снег, <b>je teplo</b> — тепло, <b>je zima</b> — холодно (и «зима» тоже!). Времена года: <i>jar, leto, jeseň, zima</i>; летом — <i>v lete</i>, зимой — <i>v zime</i>.</p>`,
      words: [
        ['budem', 'я буду'], ['plán', 'план'], ['dovolenka', 'отпуск'], ['jar', 'весна'], ['leto', 'лето'],
        ['jeseň', 'осень'], ['zima', 'зима; холодно'], ['počasie', 'погода'], ['prší', 'идёт дождь'],
        ['sneží', 'идёт снег'], ['je teplo', 'тепло'], ['pôjdem', 'я пойду / поеду'],
      ],
      phrases: [
        ['Zajtra budem pracovať doma.', 'Завтра я буду работать дома.'],
        ['V lete pôjdeme k moru.', 'Летом мы поедем на море.'],
        ['Aké bude počasie?', 'Какая будет погода?'],
        ['Dnes prší a je zima.', 'Сегодня идёт дождь и холодно.'],
        ['Kedy budeš mať dovolenku?', 'Когда у тебя будет отпуск?'],
      ],
    },
  ];

  /* сценки для ролевой игры с ИИ-репетитором */
  const SCENARIOS = [
    { id: 'kaviaren', emoji: '☕', title: 'В кафе', role: 'официант в кафе в Братиславе; ученик — посетитель, хочет что-то заказать и расплатиться' },
    { id: 'obchod', emoji: '🛒', title: 'В магазине', role: 'продавец в продуктовом магазине; ученик — покупатель, спрашивает цены и покупает продукты' },
    { id: 'zoznamenie', emoji: '🙋', title: 'Знакомство', role: 'новый знакомый на вечеринке у друзей; расспроси ученика, кто он, откуда, чем занимается' },
    { id: 'stanica', emoji: '🚆', title: 'На вокзале', role: 'кассир на железнодорожном вокзале; ученик хочет купить билет и узнать, когда поезд' },
    { id: 'lekar', emoji: '🩺', title: 'У врача', role: 'врач в поликлинике; ученик плохо себя чувствует и объясняет, что болит' },
    { id: 'hotel', emoji: '🏨', title: 'В отеле', role: 'администратор на ресепшене отеля в Высоких Татрах; ученик заселяется' },
    { id: 'cesta', emoji: '🗺', title: 'Спросить дорогу', role: 'прохожий на улице в Кошице; ученик заблудился и спрашивает, как пройти' },
  ];

  const COURSE = { UNITS, SCENARIOS, PASS: 0.8 };

  if (typeof module !== 'undefined' && module.exports) module.exports = COURSE;
  else root.SK_COURSE = COURSE;
})(typeof window !== 'undefined' ? window : globalThis);
