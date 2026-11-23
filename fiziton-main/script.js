// ============================================================
// ФИЗИТОН — ФИНАЛЬНЫЙ ДВИЖОК
// ============================================================

// ============================================================
// ИЗБРАННОЕ
// ============================================================

function getFavorites() {
  try { return JSON.parse(localStorage.getItem('fiziton-favorites') || '[]'); } catch (e) { return []; }
}

function saveFavorites(list) { localStorage.setItem('fiziton-favorites', JSON.stringify(list)); }
function isFavorite(id) { return getFavorites().includes(id); }

function toggleFavorite(id, btn) {
  const list = getFavorites();
  const index = list.indexOf(id);

  if (index === -1) {
    list.push(id);
    btn.classList.add('active');
    btn.textContent = '−';
    btn.title = 'Убрать из избранного';
  } else {
    list.splice(index, 1);
    btn.classList.remove('active');
    btn.textContent = '+';
    btn.title = 'В избранное';
  }
  saveFavorites(list);
}

// ============================================================
// УТИЛИТЫ
// ============================================================

function pluralFormulas(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'формула';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'формулы';
  return 'формул';
}

const SECTION_NAMES = {
  mehanika: 'Механика', termo: 'Термодинамика', electro: 'Электричество',
  optika: 'Оптика', atom: 'Атомная физика', astro: 'Астрономия',
};

const SECTION_FILES = {
  mehanika: 'mehanika.html', termo: 'termo.html', electro: 'electro.html',
  optika: 'optika.html', atom: 'atom.html', astro: 'astro.html',
};

// Кэш формул для быстрого поиска
const formulasById = new Map();
if (typeof formulas !== 'undefined') { formulas.forEach(f => formulasById.set(f.id, f)); }

// ============================================================
// АВТОСЧЁТЧИКИ
// ============================================================

function updateSectionCount(sectionName) {
  const el = document.getElementById('section-count');
  if (el) {
    const count = formulas.filter(f => f.section === sectionName).length;
    el.textContent = `${count} ${pluralFormulas(count)}`;
  }
}

function updateCalculatorCounts() {
  const sections = ['mehanika', 'termo', 'electro', 'optika', 'atom', 'astro'];
  sections.forEach(s => {
    const el = document.getElementById(`count-${s}`);
    if (el) {
      const count = formulas.filter(f => f.section === s).length;
      el.textContent = `${count} ${pluralFormulas(count)}`;
    }
  });
}

// ============================================================
// РЕНДЕР КАРТОЧКИ ФОРМУЛЫ
// ============================================================

function makeCardHtml(f) {
  const inputsHtml = f.inputs.map(inp => {
    const mats = (typeof MATERIALS !== 'undefined') ? (MATERIALS[f.id + '.' + inp.key] || MATERIALS[inp.key] || null) : null;
    const materialButtons = mats ? `<div class="materials">${mats.map(m => `<button type="button" class="material-btn" onclick="applyMaterial('${f.id}', '${inp.key}', ${m.value})">${m.name}</button>`).join('')}</div>` : '';

    return `
      <label>${inp.label}${inp.unit ? ' (' + inp.unit + ')' : ''}:
        ${materialButtons}
        <input type="number" id="in-${f.id}-${inp.key}" placeholder="0" step="any">
      </label>
    `;
  }).join('');

  const fav = isFavorite(f.id) ? 'active' : '';
  const favText = isFavorite(f.id) ? '−' : '+';
  const favTitle = isFavorite(f.id) ? 'Убрать из избранного' : 'В избранное';

  return `
    <section class="calc" data-search="${(f.title + ' ' + f.formula + ' ' + f.id).toLowerCase()}" data-class="${f.class}">
      <h2>${f.title}</h2>
      <div class="formula-wrap">
        <p class="formula">${f.formula}</p>
        <button class="fav-btn-inline ${fav}" onclick="toggleFavorite('${f.id}', this)" title="${favTitle}">${favText}</button>
      </div>
      ${inputsHtml}
      <button class="calc-btn" onclick="calcFormula('${f.id}')">Рассчитать</button>
      <p class="result" id="out-${f.id}">Ответ тут</p>
    </section>
  `;
}

// ============================================================
// РЕНДЕР РАЗДЕЛА
// ============================================================

function renderSection(sectionName, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const list = formulas.filter(f => f.section === sectionName);

  if (list.length === 0) {
    container.innerHTML = '<p style="color:var(--muted); padding: 40px;">Формул пока нет</p>';
    return;
  }

  const classes = [...new Set(list.map(f => f.class))].sort((a, b) => a - b);

  const panelHtml = `
    <div class="search-wrap">
      <input type="text" id="search-input" class="search-input" placeholder="Поиск по названию или формуле... (Ctrl+K)" autocomplete="off">
      <span class="search-count" id="search-count"></span>
    </div>
    <div class="class-filter" id="class-filter">
      <button class="class-btn active" data-class="all">Все</button>
      ${classes.map(c => `<button class="class-btn" data-class="${c}">${c} класс</button>`).join('')}
    </div>
  `;

  const cardsHtml = list.map(makeCardHtml).join('');

  container.innerHTML = panelHtml + `<div class="calcs" id="calc-grid">${cardsHtml}</div>`;

  const input = document.getElementById('search-input');
  const count = document.getElementById('search-count');
  const grid = document.getElementById('calc-grid');
  const filterBtns = document.querySelectorAll('.class-btn');
  let activeClass = 'all';

  function applyFilters() {
    const q = input.value.trim().toLowerCase();
    const cards = grid.querySelectorAll('.calc');
    let visible = 0;

    cards.forEach(card => {
      const key = card.getAttribute('data-search');
      const cls = card.getAttribute('data-class');
      const match = key.includes(q) && ((activeClass === 'all') || (cls === activeClass));
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    count.textContent = (q === '' && activeClass === 'all') ? `Всего: ${cards.length}` : `Найдено: ${visible} из ${cards.length}`;

    const empty = document.getElementById('search-empty');
    if (visible === 0) {
      if (!empty) {
        const p = document.createElement('p');
        p.id = 'search-empty';
        p.style.cssText = 'color: var(--muted); padding: 40px; text-align: center; grid-column: 1 / -1; font-family: JetBrains Mono, monospace; font-size: 14px;';
        p.textContent = 'Ничего не найдено. Попробуй другой запрос.';
        grid.appendChild(p);
      }
    } else if (empty) { empty.remove(); }
  }

  input.addEventListener('input', applyFilters);

  if (!window._fizitonKeyHandler) {
    window._fizitonKeyHandler = function(e) {
      const searchInput = document.getElementById('search-input');
      if (!searchInput) return;
      const tag = document.activeElement ? document.activeElement.tagName : '';
      const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable);

      if (e.key === 'Escape' && document.activeElement === searchInput) {
        e.preventDefault(); searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); searchInput.blur(); return false;
      }
      if (e.key === '/' && !isTyping) {
        e.preventDefault(); e.stopPropagation(); searchInput.focus(); searchInput.select(); return false;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.keyCode === 75)) {
        e.preventDefault(); e.stopPropagation(); searchInput.focus(); searchInput.select(); return false;
      }
    };
    document.addEventListener('keydown', window._fizitonKeyHandler, true);
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeClass = btn.getAttribute('data-class');
      applyFilters();
    });
  });

  applyFilters();
  updateSectionCount(sectionName);
}

// ============================================================
// ИЗБРАННОЕ И РАСЧЁТ
// ============================================================

function renderFavorites(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const favIds = getFavorites();
  const list = formulas.filter(f => favIds.includes(f.id));

  if (list.length === 0) {
    container.innerHTML = `<div class="empty-fav"><p>У тебя пока нет избранных формул.</p><p>Открой любой раздел и нажми <span style="color:var(--accent)">+</span> на карточке.</p><a href="calculator.html" class="back" style="margin-top: 24px;">→ в формуляр</a></div>`;
    return;
  }

  const cardsHtml = list.map(f => {
    const inputsHtml = f.inputs.map(inp => `<label>${inp.label}${inp.unit ? ' (' + inp.unit + ')' : ''}:<input type="number" id="in-${f.id}-${inp.key}" placeholder="0" step="any"></label>`).join('');
    return `
      <section class="calc">
        <h2>${f.title}</h2>
        <div class="formula-wrap"><p class="formula">${f.formula}</p><button class="fav-btn-inline active" onclick="toggleFavorite('${f.id}', this); setTimeout(() => renderFavorites('${containerId}'), 100);">−</button></div>
        ${inputsHtml}
        <button class="calc-btn" onclick="calcFormula('${f.id}')">Рассчитать</button>
        <p class="result" id="out-${f.id}">Ответ тут</p>
      </section>
    `;
  }).join('');

  container.innerHTML = `<div class="calcs">${cardsHtml}</div>`;
}

function calcFormula(formulaId) {
  const f = formulasById.get(formulaId);
  if (!f) return;
  const values = {};

  for (const inp of f.inputs) {
    const el = document.getElementById(`in-${f.id}-${inp.key}`);
    const val = parseFloat(el.value);
    if (isNaN(val)) {
      document.getElementById(`out-${f.id}`).textContent = `Ошибка: заполни поле «${inp.label}»`;
      return;
    }
    values[inp.key] = val;
  }

  let result;
  try { result = f.calc(values); } catch (e) {
    document.getElementById(`out-${f.id}`).textContent = `Ошибка: ${e.message}`; return;
  }

  if (!isFinite(result)) {
    document.getElementById(`out-${f.id}`).textContent = 'Ошибка: деление на ноль'; return;
  }
  document.getElementById(`out-${f.id}`).textContent = `${f.resultLabel} = ${result.toFixed(2)} ${f.resultUnit}`;
}

function applyMaterial(formulaId, key, value) {
  const input = document.getElementById(`in-${formulaId}-${key}`);
  if (!input) return;
  input.value = value;
  input.classList.add('material-applied');
  setTimeout(() => input.classList.remove('material-applied'), 600);
}

// ============================================================
// ГЛОБАЛЬНЫЙ ПОИСК
// ============================================================

function initGlobalSearch() {
  const input = document.getElementById('global-search');
  const results = document.getElementById('global-search-results');
  const menu = document.getElementById('sections-menu');
  const count = document.getElementById('global-search-count');

  if (!input || !results) return;

  function search() {
    const q = input.value.trim().toLowerCase();
    if (q === '') { results.innerHTML = ''; menu.style.display = ''; count.textContent = ''; return; }
    menu.style.display = 'none';

    const found = formulas.filter(f => `${f.title} ${f.formula} ${f.id}`.toLowerCase().includes(q));
    count.textContent = `Найдено: ${found.length}`;

    if (found.length === 0) {
      results.innerHTML = `<div class="global-empty">Ничего не найдено по запросу «${input.value}»</div>`; return;
    }

    results.innerHTML = found.map(f => `
      <a href="${SECTION_FILES[f.section]}" class="global-result">
        <div class="global-result-left"><p class="global-result-formula">${f.formula}</p><p class="global-result-title">${f.title}</p></div>
        <div class="global-result-right"><span class="global-result-section">${SECTION_NAMES[f.section] || f.section}</span><span class="global-result-arrow">→</span></div>
      </a>
    `).join('');
  }

  input.addEventListener('input', search);

  document.addEventListener('keydown', function(e) {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable);
    if (e.key === '/' && !isTyping) { e.preventDefault(); input.focus(); input.select(); }
    if (e.key === 'Escape' && document.activeElement === input) { input.value = ''; search(); input.blur(); }
  });
}

// ============================================================
// АКСИОМ — СПИСОК И СТРАНИЦА ТЕМЫ
// ============================================================

function renderTheoryList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (typeof THEORY === 'undefined' || THEORY.length === 0) { container.innerHTML = '<p style="color:var(--muted); padding: 40px;">Тем пока нет</p>'; return; }

  const sorted = [...THEORY].sort((a, b) => a.class - b.class);
  const cardsHtml = sorted.map(t => `<a href="topic.html?id=${t.id}" class="topic-card" data-search="${(t.title + ' ' + t.intro).toLowerCase()}"><span class="topic-class">${t.class} класс</span><h2>${t.title}</h2><p>${t.intro.slice(0, 80)}...</p></a>`).join('');
  container.innerHTML = `<div class="topics-row">${cardsHtml}</div>`;

  const input = document.getElementById('theory-search');
  const count = document.getElementById('theory-count');
  if (!input) return;

  function filter() {
    const q = input.value.trim().toLowerCase();
    const cards = container.querySelectorAll('.topic-card');
    let visible = 0;
    cards.forEach(card => {
      const match = card.getAttribute('data-search').includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });
    count.textContent = q === '' ? `Всего: ${cards.length}` : `Найдено: ${visible} из ${cards.length}`;
  }

  input.addEventListener('input', filter);
  filter();

  document.addEventListener('keydown', function(e) {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); input.focus(); input.select(); }
    if (e.key === 'Escape' && document.activeElement === input) { input.value = ''; filter(); input.blur(); }
  });

  const scrollRow = container.querySelector('.topics-row');
  if (scrollRow) {
    scrollRow.addEventListener('wheel', function(e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        scrollRow.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
      }
    }, { passive: false });
  }
}

function renderTopic(containerId, topicId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (typeof THEORY === 'undefined') { container.innerHTML = '<p style="color: var(--muted);">Файл theory.js не подключён</p>'; return; }

  const topic = THEORY.find(t => t.id === topicId);
  if (!topic) {
    container.innerHTML = `<header><h1>Тема не найдена</h1><p>Проверь ссылку или вернись в Аксиом</p></header><p style="max-width: 700px; margin: 0 auto; color: var(--muted);">Возможно, ссылка устарела или в адресе ошибка.</p>`;
    return;
  }

  const explanationHtml = (topic.explanation || []).map(p => `<p>${p}</p>`).join('');
  const videoHtml = topic.video ? `<div class="video-wrap"><iframe src="${topic.video}" frameborder="0" allow="clipboard-write; autoplay" allowFullScreen></iframe></div>` : '<p style="color: var(--muted);">Видео пока нет</p>';

  const tasksHtml = topic.tasks.map((task, i) => {
    const paintId = `paint-${topic.id}-${i}`;
    return `
      <div class="task">
        <div class="task-head"><span class="task-num">Задача ${i + 1}</span><span class="task-level ${task.level === 'легко' ? 'easy' : task.level === 'средне' ? 'medium' : 'hard'}">${task.level}</span></div>
        <p class="task-question">${task.question}</p>
        <details class="task-solution"><summary>Показать решение</summary><p>${task.solution}</p></details>
        <div class="paint-container" id="${paintId}"></div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <header><h1>${topic.title}</h1><p>${topic.class} класс</p></header>
    <article class="topic-content">
      <section class="topic-section"><h2>Кратко</h2><p>${topic.intro}</p></section>
      <section class="topic-section"><h2>Объяснение</h2>${explanationHtml}</section>
      <section class="topic-section"><h2>Видео</h2>${videoHtml}</section>
      <section class="topic-section"><h2>Задачи</h2>${tasksHtml}</section>
    </article>
  `;

  if (typeof createPaintWidget === 'function') {
    topic.tasks.forEach((task, i) => createPaintWidget(`paint-${topic.id}-${i}`, `fiziton-paint-${topic.id}-${i}`));
  }
}

// ============================================================
// ЗАДАЧНИК
// ============================================================

function renderTasksList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (typeof THEORY === 'undefined') { container.innerHTML = '<p style="color:var(--muted);">Файл theory.js не подключён</p>'; return; }

  const topicsWithTasks = THEORY.filter(t => t.tasks && t.tasks.length > 0);
  container.innerHTML = topicsWithTasks.map(t => `<a href="topic-tasks.html?topic=${t.id}" class="card" data-search="${(t.title + ' ' + t.class).toLowerCase()}"><span class="icon">${t.class} класс</span><h2>${t.title}</h2><p>${t.tasks.length} задачи</p></a>`).join('');

  const input = document.getElementById('tasks-search');
  const count = document.getElementById('tasks-count');
  if (input) {
    function filter() {
      const q = input.value.trim().toLowerCase();
      const cards = container.querySelectorAll('.card');
      let visible = 0;
      cards.forEach(card => {
        const match = card.getAttribute('data-search').includes(q);
        card.style.display = match ? '' : 'none';
        if (match) visible++;
      });
      count.textContent = q === '' ? `Всего: ${cards.length}` : `Найдено: ${visible} из ${cards.length}`;
    }
    input.addEventListener('input', filter);
    filter();
    document.addEventListener('keydown', function(e) {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') { e.preventDefault(); input.focus(); input.select(); }
      if (e.key === 'Escape' && document.activeElement === input) { input.value = ''; filter(); input.blur(); }
    });
  }

  const randBtn = document.getElementById('btn-random-task');
  if (randBtn) randBtn.addEventListener('click', getRandomTask);

  const classSelect = document.getElementById('rand-class');
  if (classSelect) classSelect.addEventListener('change', updateSectionFilter);
  updateSectionFilter();
}

function updateSectionFilter() {
  const classFilter = document.getElementById('rand-class').value;
  const sectionSelect = document.getElementById('rand-section');
  if (!sectionSelect) return;

  const availableSections = new Set();
  THEORY.forEach(topic => {
    if (!topic.tasks || topic.tasks.length === 0) return;
    if (classFilter !== 'all' && topic.class.toString() !== classFilter) return;
    if (topic.section) availableSections.add(topic.section);
  });

  sectionSelect.innerHTML = '<option value="all">Любой раздел</option>';
  Array.from(availableSections).forEach(sec => {
    if (SECTION_NAMES[sec]) {
      const opt = document.createElement('option');
      opt.value = sec; opt.textContent = SECTION_NAMES[sec];
      sectionSelect.appendChild(opt);
    }
  });
}

function getRandomTask() {
  const classFilter = document.getElementById('rand-class').value;
  const sectionFilter = document.getElementById('rand-section').value;
  let allTasks = [];
  
  THEORY.forEach(topic => {
    if (!topic.tasks || topic.tasks.length === 0) return;
    if (classFilter !== 'all' && topic.class.toString() !== classFilter) return;
    if (sectionFilter !== 'all' && topic.section !== sectionFilter) return;
    topic.tasks.forEach((task, index) => allTasks.push({ topicId: topic.id, taskIndex: index }));
  });

  if (allTasks.length === 0) { alert('Задач по выбранным фильтрам не найдено.'); return; }
  const chosen = allTasks[Math.floor(Math.random() * allTasks.length)];
  window.location.href = `task-view.html?topic=${chosen.topicId}&task=${chosen.taskIndex}`;
}

function renderTopicTasks(containerId, topicId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const topic = THEORY.find(t => t.id === topicId);
  if (!topic || !topic.tasks) { container.innerHTML = '<header><h1>Тема не найдена</h1></header>'; return; }

  container.innerHTML = `
    <header><h1>${topic.title}</h1><p>${topic.class} класс • ${topic.tasks.length} задачи</p></header>
    <div class="topic-tasks-list">
      ${topic.tasks.map((task, i) => `
        <a href="task-view.html?topic=${topic.id}&task=${i}" class="task-item">
          <div class="task-item-info">
            <span class="task-level ${task.level === 'легко' ? 'easy' : task.level === 'средне' ? 'medium' : 'hard'}">${task.level}</span>
            <p class="task-item-question">${task.question}</p>
          </div>
          <span class="task-item-arrow">→</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderSingleTask(containerId, topicId, taskIndex) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const topic = THEORY.find(t => t.id === topicId);
  if (!topic || !topic.tasks || !topic.tasks[taskIndex]) {
    container.innerHTML = `<header><h1>Задача не найдена</h1><p>Проверь ссылку или вернись в задачник</p></header>`; return;
  }

  const task = topic.tasks[taskIndex];
  const paintId = `paint-task-${topic.id}-${taskIndex}`;
  const prevBtn = taskIndex > 0 ? `<a href="task-view.html?topic=${topic.id}&task=${taskIndex - 1}" class="back">← Предыдущая</a>` : `<span></span>`;
  const nextBtn = taskIndex < topic.tasks.length - 1 ? `<a href="task-view.html?topic=${topic.id}&task=${taskIndex + 1}" class="back">Следующая →</a>` : `<span></span>`;

  container.innerHTML = `
    <header><h1>${topic.title}</h1><p>Задача ${taskIndex + 1} из ${topic.tasks.length} • ${topic.class} класс</p></header>
    <div class="task-view">
      <div class="task-main">
        <div class="task-head"><span class="task-level ${task.level === 'легко' ? 'easy' : task.level === 'средне' ? 'medium' : 'hard'}">${task.level}</span></div>
        <p class="task-question">${task.question}</p>
        <div class="task-answer-area">
          <label>Твой ответ:<input type="text" id="user-answer" placeholder="Введи ответ..."></label>
          <button class="calc-btn" onclick="toggleSolution()">Показать решение</button>
        </div>
        <div class="task-solution-block" id="task-solution-block" style="display:none;"><strong>Решение:</strong><p>${task.solution}</p></div>
      </div>
      <div class="task-paint-side">
        <h3>Черновик (рисование)</h3>
        <div class="paint-container" id="${paintId}"></div>
      </div>
    </div>
    <div class="task-nav">${prevBtn}${nextBtn}</div>
  `;

  if (typeof createPaintWidget === 'function') createPaintWidget(paintId, `fiziton-paint-task-${topic.id}-${taskIndex}`);
}

function toggleSolution() {
  const block = document.getElementById('task-solution-block');
  if (block) block.style.display = block.style.display === 'none' ? 'block' : 'none';
}