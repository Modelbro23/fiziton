// ============================================================
// ПЕРЕКЛЮЧАТЕЛЬ ТЕМ (4 темы, минимализм)
// ============================================================

const THEMES = [
  { id: 'dark',       name: 'Тёмная',      icon: '●' },
  { id: 'light',      name: 'Светлая',     icon: '●' },
  { id: 'cyberpunk',  name: 'Киберпанк',   icon: '●' },
  { id: 'steampunk',  name: 'Стимпанк',    icon: '●' },
];

const DEFAULT_THEME = 'dark';
const THEME_KEY = 'fiziton-theme';

function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) ? themeId : DEFAULT_THEME;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
}

function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
}

function initThemeSwitcher() {
  applyTheme(getSavedTheme());
  const currentTheme = THEMES.find(t => t.id === getSavedTheme()) || THEMES[0];

  const switcher = document.createElement('div');
  switcher.className = 'theme-switcher';
  switcher.innerHTML = `
    <button class="theme-toggle-btn" id="theme-toggle" title="Сменить тему">
      ${currentTheme.icon}
    </button>
    <div class="theme-panel hidden" id="theme-panel">
      ${THEMES.map(t => `
        <button class="theme-option ${t.id === getSavedTheme() ? 'active' : ''}"
                data-theme-name="${t.id}">
          <span class="dot"></span>
          <span>${t.icon} ${t.name}</span>
        </button>
      `).join('')}
    </div>
  `;
  document.body.appendChild(switcher);

  const btn = document.getElementById('theme-toggle');
  const panel = document.getElementById('theme-panel');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('hidden');
  });

  panel.querySelectorAll('.theme-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const themeId = opt.getAttribute('data-theme-name');
      applyTheme(themeId);
      const theme = THEMES.find(t => t.id === themeId);
      btn.textContent = theme.icon;
      panel.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      panel.classList.add('hidden');
    });
  });

  document.addEventListener('click', (e) => {
    if (!switcher.contains(e.target)) panel.classList.add('hidden');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeSwitcher);
} else {
  initThemeSwitcher();
}