// ============================================================
// ДВИЖОК ФОРМУЛЯРА
// ============================================================
// Отвечает за:
//   • Рендер карточек формул (по разделам)
//   • Поиск внутри раздела + фильтр по классу
//   • Избранное (сохранение в localStorage)
//   • Подстановку материалов (вода, медь, алюминий и т.д.)
//   • Автосчётчики формул в заголовках
//   • Глобальный поиск по всем разделам (для calculator.html)
//   • Горячие клавиши (/, Ctrl+K, Esc)
// ============================================================


// ============================================================
// ИЗБРАННОЕ
// ============================================================

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem('fiziton-favorites') || '[]');
  } catch (e) {
    return [];
  }
}

function saveFavorites(list) {
  localStorage.setItem('fiziton-favorites', JSON.stringify(list));
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function toggleFavorite(id, btn) {
  const list = getFavorites();
  const index = list.indexOf(id);

  if (index === -1) {
    list.push(id);
    btn.classList.add('active');
    btn.textContent = '★';
  } else {
    list.splice(index, 1);
    btn.classList.remove('active');
    btn.textContent = '☆';
  }

  saveFavorites(list);
}


// ============================================================
// СКЛОНЕНИЕ СЛОВ
// ============================================================

function pluralFormulas(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod10 === 1 && mod100 !== 11) return 'формула';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'формулы';
  return 'формул';
}


// ============================================================
// АВТОСЧЁТЧИКИ
// ============================================================

function updateSectionCount(sectionName) {
  const count = formulas.filter(f => f.section === sectionName).length;
  const el = document.getElementById('section-count');
  if (el) {
    el.textContent = `${count} ${pluralFormulas(count)}`;
  }
}

function updateCalculatorCounts() {
  const sections = ['mehanika', 'termo', 'electro', 'optika', 'atom', 'astro'];

  sections.forEach(s => {
    const count = formulas.filter(f => f.section === s).length;
    const el = document.getElementById(`count-${s}`);
    if (el) {
      el.textContent = `${count} ${pluralFormulas(count)}`;
    }
  });
}


// ============================================================
// РЕНДЕР КАРТОЧКИ ФОРМУЛЫ
// ============================================================

function makeCardHtml(f) {
  const inputsHtml = f.inputs.map(inp => {
    const mats = (typeof MATERIALS !== 'undefined')
      ? (MATERIALS[f.id + '.' + inp.key] || MATERIALS[inp.key] || null)
      : null;

    const materialButtons = mats
      ? `<div class="materials">
           ${mats.map(m => `
             <button
               type="button"
               class="material-btn"
               onclick="applyMaterial('${f.id}', '${inp.key}', ${m.value})"
             >${m.name}</button>
           `).join('')}
         </div>`
      : '';

    return `
      <label>${inp.label}${inp.unit ? ' (' + inp.unit + ')' : ''}:
        ${materialButtons}
        <input type="number" id="in-${f.id}-${inp.key}" placeholder="0" step="any">
      </label>
    `;
  }).join('');

  const fav = isFavorite(f.id) ? 'active' : '';
  const star = isFavorite(f.id) ? '★' : '☆';

  return `
    <section class="calc" data-search="${(f.title + ' ' + f.formula + ' ' + f.id).toLowerCase()}" data-class="${f.class}">
      <h2>${f.title}</h2>
      <div class="formula-wrap">
        <p class="formula">${f.formula}</p>
        <button class="fav-btn-inline ${fav}" onclick="toggleFavorite('${f.id}', this)" title="В избранное">${star}</button>
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
      <input
        type="text"
        id="search-input"
        class="search-input"
        placeholder="Поиск по названию или формуле... (Ctrl+K)"
        autocomplete="off"
      >
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

      const matchSearch = key.includes(q);
      const matchClass = (activeClass === 'all') || (cls === activeClass);
      const match = matchSearch && matchClass;

      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    if (q === '' && activeClass === 'all') {
      count.textContent = `Всего: ${cards.length}`;
    } else {
      count.textContent = `Найдено: ${visible} из ${cards.length}`;
    }

    const empty = document.getElementById('search-empty');
    if (visible === 0) {
      if (!empty) {
        const p = document.createElement('p');
        p.id = 'search-empty';
        p.style.cssText = 'color: var(--muted); padding: 40px; text-align: center; grid-column: 1 / -1; font-family: JetBrains Mono, monospace; font-size: 14px;';
        p.textContent = 'Ничего не найдено. Попробуй другой запрос.';
        grid.appendChild(p);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  input.addEventListener('input', applyFilters);

  if (!window._fizitonKeyHandler) {
    window._fizitonKeyHandler = function(e) {
      const searchInput = document.getElementById('search-input');
      if (!searchInput) return;

      function focusAndScrollToSearch() {
        const searchWrap = document.querySelector('.search-wrap');
        if (searchWrap) {
          searchWrap.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
        searchInput.focus({ preventScroll: true });
        searchInput.select();
      }

      if (e.key === 'Escape' && document.activeElement === searchInput) {
        e.preventDefault();
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.blur();
        return false;
      }

      const tag = document.activeElement ? document.activeElement.tagName : '';
      const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable);

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        e.stopPropagation();
        focusAndScrollToSearch();
        return false;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.keyCode === 75)) {
        e.preventDefault();
        e.stopPropagation();
        e.cancelBubble = true;
        focusAndScrollToSearch();

        setTimeout(() => {
          if (document.activeElement !== searchInput) {
            searchInput.focus({ preventScroll: true });
            searchInput.select();
          }
        }, 0);

        return false;
      }
    };

    document.addEventListener('keydown', window._fizitonKeyHandler, true);
    window.addEventListener('keydown', window._fizitonKeyHandler, true);
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
// СТРАНИЦА ИЗБРАННОГО
// ============================================================

function renderFavorites(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const favIds = getFavorites();
  const list = formulas.filter(f => favIds.includes(f.id));

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-fav">
        <p>У тебя пока нет избранных формул.</p>
        <p>Открой любой раздел и нажми <span style="color:var(--gold)">☆</span> на карточке.</p>
        <a href="calculator.html" class="back" style="margin-top: 24px;">→ в формуляр</a>
      </div>
    `;
    return;
  }

  const cardsHtml = list.map(f => {
    const inputsHtml = f.inputs.map(inp => `
      <label>${inp.label}${inp.unit ? ' (' + inp.unit + ')' : ''}:
        <input type="number" id="in-${f.id}-${inp.key}" placeholder="0" step="any">
      </label>
    `).join('');

    return `
      <section class="calc">
        <h2>${f.title}</h2>
        <div class="formula-wrap">
          <p class="formula">${f.formula}</p>
          <button class="fav-btn-inline active" onclick="toggleFavorite('${f.id}', this); setTimeout(() => renderFavorites('${containerId}'), 100);" title="Убрать из избранного">★</button>
        </div>
        ${inputsHtml}
        <button class="calc-btn" onclick="calcFormula('${f.id}')">Рассчитать</button>
        <p class="result" id="out-${f.id}">Ответ тут</p>
      </section>
    `;
  }).join('');

  container.innerHTML = `<div class="calcs">${cardsHtml}</div>`;
}


// ============================================================
// РАСЧЁТ ФОРМУЛЫ
// ============================================================

function calcFormula(formulaId) {
  const f = formulas.find(x => x.id === formulaId);
  if (!f) return;

  const values = {};

  for (const inp of f.inputs) {
    const el = document.getElementById(`in-${f.id}-${inp.key}`);
    const val = parseFloat(el.value);

    if (isNaN(val)) {
      document.getElementById(`out-${f.id}`).textContent =
        `⚠️ Заполни поле «${inp.label}»`;
      return;
    }

    values[inp.key] = val;
  }

  let result;
  try {
    result = f.calc(values);
  } catch (e) {
    document.getElementById(`out-${f.id}`).textContent =
      `⚠️ Ошибка: ${e.message}`;
    return;
  }

  // Проверка на деление на ноль и другие нефинитные результаты
  if (!isFinite(result)) {
    document.getElementById(`out-${f.id}`).textContent =
      '⚠️ Ошибка: деление на ноль';
    return;
  }

  const out = document.getElementById(`out-${f.id}`);
  out.textContent = `${f.resultLabel} = ${result.toFixed(2)} ${f.resultUnit}`;
}


// ============================================================
// ПОДСТАНОВКА МАТЕРИАЛА
// ============================================================

function applyMaterial(formulaId, key, value) {
  const input = document.getElementById(`in-${formulaId}-${key}`);
  if (!input) return;

  input.value = value;

  input.classList.add('material-applied');
  setTimeout(() => input.classList.remove('material-applied'), 600);
}


// ============================================================
// ГЛОБАЛЬНЫЙ ПОИСК (только для calculator.html)
// ============================================================

const SECTION_NAMES = {
  mehanika: 'Механика',
  termo: 'Термодинамика',
  electro: 'Электричество',
  optika: 'Оптика',
  atom: 'Атомная физика',
  astro: 'Астрономия',
};

const SECTION_FILES = {
  mehanika: 'mehanika.html',
  termo: 'termo.html',
  electro: 'electro.html',
  optika: 'optika.html',
  atom: 'atom.html',
  astro: 'astro.html',
};

function initGlobalSearch() {
  const input = document.getElementById('global-search');
  const results = document.getElementById('global-search-results');
  const menu = document.getElementById('sections-menu');
  const count = document.getElementById('global-search-count');

  if (!input || !results) return;

  function search() {
    const q = input.value.trim().toLowerCase();

    if (q === '') {
      results.innerHTML = '';
      menu.style.display = '';
      count.textContent = '';
      return;
    }

    menu.style.display = 'none';

    const found = formulas.filter(f => {
      const key = `${f.title} ${f.formula} ${f.id}`.toLowerCase();
      return key.includes(q);
    });

    count.textContent = `Найдено: ${found.length}`;

    if (found.length === 0) {
      results.innerHTML = `
        <div class="global-empty">
          Ничего не найдено по запросу «${input.value}»
        </div>
      `;
      return;
    }

    results.innerHTML = found.map(f => `
      <a href="${SECTION_FILES[f.section]}" class="global-result">
        <div class="global-result-left">
          <p class="global-result-formula">${f.formula}</p>
          <p class="global-result-title">${f.title}</p>
        </div>
        <div class="global-result-right">
          <span class="global-result-section">${SECTION_NAMES[f.section] || f.section}</span>
          <span class="global-result-arrow">→</span>
        </div>
      </a>
    `).join('');
  }

  input.addEventListener('input', search);

  document.addEventListener('keydown', function(e) {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement.isContentEditable);

    if (e.key === '/' && !isTyping) {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      search();
      input.blur();
    }
  });
}

// ============================================================
// АКСИОМ — СПИСОК ТЕМ
// ============================================================
// Горизонтальный скролл карточек с поиском.

function renderTheoryList(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof THEORY === 'undefined' || THEORY.length === 0) {
    container.innerHTML = '<p style="color:var(--muted); padding: 40px;">Тем пока нет</p>';
    return;
  }

  // Сортируем темы: сначала 7 класс, потом 8, потом 9
  const sorted = [...THEORY].sort((a, b) => a.class - b.class);

  // Строим карточки
  const cardsHtml = sorted.map(t => `
    <a href="topic.html?id=${t.id}" class="topic-card" data-search="${(t.title + ' ' + t.intro).toLowerCase()}">
      <span class="topic-class">${t.class} класс</span>
      <h2>${t.title}</h2>
      <p>${t.intro.slice(0, 80)}...</p>
    </a>
  `).join('');

  container.innerHTML = `<div class="topics-row">${cardsHtml}</div>`;

  // Поиск
  const input = document.getElementById('theory-search');
  const count = document.getElementById('theory-count');
  if (!input) return;

  function filter() {
    const q = input.value.trim().toLowerCase();
    const cards = container.querySelectorAll('.topic-card');
    let visible = 0;

    cards.forEach(card => {
      const key = card.getAttribute('data-search');
      const match = key.includes(q);
      card.style.display = match ? '' : 'none';
      if (match) visible++;
    });

    if (q === '') {
      count.textContent = `Всего: ${cards.length}`;
    } else {
      count.textContent = `Найдено: ${visible} из ${cards.length}`;
    }
  }

  input.addEventListener('input', filter);
  filter();

  // Горячая клавиша /
  document.addEventListener('keydown', function(e) {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    const isTyping = (tag === 'INPUT' || tag === 'TEXTAREA');

    if (e.key === '/' && !isTyping) {
      e.preventDefault();
      input.focus();
      input.select();
    }
    if (e.key === 'Escape' && document.activeElement === input) {
      input.value = '';
      filter();
      input.blur();
    }
  });

  // ============================================================
  // ПЛАВНАЯ ПРОКРУТКА КОЛЁСИКОМ (влево-вправо)
  // ============================================================
  const scrollRow = container.querySelector('.topics-row');
  
  if (scrollRow) {
    scrollRow.addEventListener('wheel', function(e) {
      // Если пользователь крутит именно колёсиком (а не тачпадом)
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault(); // Останавливаем вертикальную прокрутку страницы
        
        // Умножаем на 1.5, чтобы прокрутка была чуть быстрее и отзывчивее
        scrollRow.scrollBy({
          left: e.deltaY * 1.5,
          behavior: 'smooth' // Включаем встроенную плавность браузера
        });
      }
    }, { passive: false });
  }
}


// ============================================================
// АКСИОМ — СТРАНИЦА ТЕМЫ
// ============================================================
// Рисует одну тему: объяснение, видео, задачи с решениями.

function renderTopic(containerId, topicId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof THEORY === 'undefined') {
    container.innerHTML = '<p style="color: var(--muted);">Файл theory.js не подключён</p>';
    return;
  }

  const topic = THEORY.find(t => t.id === topicId);

  if (!topic) {
    container.innerHTML = `
      <header>
        <h1>Тема не найдена</h1>
        <p>Проверь ссылку или вернись в Аксиом</p>
      </header>
      <p style="max-width: 700px; margin: 0 auto; color: var(--muted);">
        Возможно, ссылка устарела или в адресе ошибка.
      </p>
    `;
    return;
  }

  // Задачи
  const tasksHtml = topic.tasks.map((task, i) => `
    <div class="task">
      <div class="task-head">
        <span class="task-num">Задача ${i + 1}</span>
        <span class="task-level ${task.level === 'легко' ? 'easy' : 'hard'}">${task.level}</span>
      </div>
      <p class="task-question">${task.question}</p>
      <details class="task-solution">
        <summary>Показать решение</summary>
        <p>${task.solution}</p>
      </details>
    </div>
  `).join('');

  // Видео (встроенное с RuTube)
  const videoHtml = topic.video
    ? `
      <div class="video-wrap">
        <iframe
          src="${topic.video}"
          title="Видео по теме"
          frameborder="0"
          allow="clipboard-write; autoplay"
          webkitAllowFullScreen
          mozallowfullscreen
          allowFullScreen
        ></iframe>
      </div>
    `
    : '<p style="color: var(--muted);">Видео пока нет</p>';

  container.innerHTML = `
    <header>
      <h1>${topic.title}</h1>
      <p>${topic.class} класс</p>
    </header>

    <article class="topic-content">

      <section class="topic-section">
        <h2>Кратко</h2>
        <p>${topic.intro}</p>
      </section>

      <section class="topic-section">
        <h2>Видео</h2>
        ${videoHtml}
      </section>

      <section class="topic-section">
        <h2>Задачи</h2>
        ${tasksHtml}
      </section>

    </article>
  `;
}