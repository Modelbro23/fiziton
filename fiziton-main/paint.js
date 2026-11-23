// ============================================================
// ПЕЙНТ — РИСОВАЛКА ДЛЯ ЗАДАЧ
// ============================================================

function createPaintWidget(containerId, storageKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Разметка
  container.innerHTML = `
    <div class="paint-widget">
      <div class="paint-toolbar">
        <button class="paint-btn active" data-tool="brush" title="Кисть">✎</button>
        <button class="paint-btn" data-tool="eraser" title="Ластик">⌫</button>
        <input type="color" class="paint-color" value="#4f9cf9" title="Цвет">
        <input type="range" class="paint-size" min="1" max="20" value="3" title="Толщина">
        <button class="paint-btn paint-clear" title="Очистить">Очистить</button>
      </div>
      <canvas class="paint-canvas"></canvas>
    </div>
  `;

  const canvas = container.querySelector('.paint-canvas');
  const ctx = canvas.getContext('2d');
  const colorInput = container.querySelector('.paint-color');
  const sizeInput = container.querySelector('.paint-size');
  const toolBtns = container.querySelectorAll('.paint-btn[data-tool]');
  const clearBtn = container.querySelector('.paint-clear');

  let isDrawing = false;
  let currentTool = 'brush';
  let currentColor = '#4f9cf9';
  let currentSize = 3;

  // Настройка размера холста под контейнер
  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    if (temp.width > 0) temp.getContext('2d').drawImage(canvas, 0, 0);

    canvas.width = rect.width;
    canvas.height = Math.max(200, rect.width * 0.5);

    // Восстанавливаем рисунок (если был)
    if (temp.width > 0) {
      ctx.drawImage(temp, 0, 0, canvas.width, canvas.height);
    }
  }

  // Загрузка сохраненного рисунка
  function loadSaved() {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = saved;
    }
  }

  // Сохранение
  function save() {
    localStorage.setItem(storageKey, canvas.toDataURL());
  }

  // Получение координат
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  // Рисование
  function startDraw(e) {
    e.preventDefault();
    isDrawing = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = currentTool === 'eraser' ? '#1e1e1e' : currentColor;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function stopDraw() {
    if (isDrawing) {
      isDrawing = false;
      ctx.closePath();
      save();
    }
  }

  // Обработчики
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDraw);
  canvas.addEventListener('mouseleave', stopDraw);

  canvas.addEventListener('touchstart', startDraw, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDraw);

  // Инструменты
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      toolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.getAttribute('data-tool');
    });
  });

  colorInput.addEventListener('input', (e) => currentColor = e.target.value);
  sizeInput.addEventListener('input', (e) => currentSize = parseInt(e.target.value));

  clearBtn.addEventListener('click', () => {
    if (confirm('Очистить рисунок?')) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      save();
    }
  });

  // Инициализация
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  loadSaved();
}