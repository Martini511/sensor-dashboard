// ─── Variablen ────────────────────────────────────────

let animationId     = null;
let activeGamepad   = null;
let lastButtonState = [];
let initialized     = false;

// ─── Beim Laden ───────────────────────────────────────

window.addEventListener('load', () => {
  scanForGamepads();
});

window.addEventListener('gamepadconnected', (event) => {
  console.log('Verbunden:', event.gamepad.id);
  scanForGamepads();
});

window.addEventListener('gamepaddisconnected', (event) => {
  if (activeGamepad === event.gamepad.index) {
    handleDisconnect();
  }
});

// ─── Alle Controller anzeigen zur Auswahl ─────────────

function scanForGamepads() {
  const gamepads = navigator.getGamepads();
  const found    = [];

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (gp !== null) {
      found.push(gp);
    }
  }

  if (found.length === 0) {
    // Kein Controller gefunden
    setStatus(false, 'Kein Controller gefunden');
    return;
  }

  if (found.length === 1) {
    // Nur ein Controller → direkt verbinden
    initController(found[0]);
    return;
  }

  // Mehrere Controller → Auswahl anzeigen!
  showControllerSelection(found);
}

// ─── Auswahl Dialog ───────────────────────────────────

function showControllerSelection(gamepads) {
  // Status Card leeren
  const statusCard = document.getElementById('status-card');

  statusCard.innerHTML = `
    <h2 style="color: #58a6ff; margin-bottom: 1rem;">
      🎮 Controller auswählen
    </h2>
    <p style="color: #8b949e; margin-bottom: 1rem; font-size: 0.9rem;">
      Mehrere Geräte gefunden. 
      Wähle deinen Controller:
    </p>
    <div id="controller-list"></div>
  `;

  const list = document.getElementById('controller-list');

  gamepads.forEach((gp) => {
    const item       = document.createElement('div');
    item.className   = 'controller-item';
    item.innerHTML   = `
      <div class="ctrl-item-info">
        <span class="ctrl-item-index">
          Index ${gp.index}
        </span>
        <span class="ctrl-item-name">
          ${gp.id}
        </span>
        <span class="ctrl-item-details">
          ${gp.buttons.length} Tasten | 
          ${gp.axes.length} Achsen
        </span>
      </div>
      <button class="select-btn"
              onclick="selectController(${gp.index})">
        Auswählen
      </button>
    `;
    list.appendChild(item);
  });
}

// ─── Controller auswählen ─────────────────────────────

function selectController(index) {
  const gamepads = navigator.getGamepads();
  const gp       = gamepads[index];

  if (gp) {
    initController(gp);
  }
}

// ─── Controller initialisieren ────────────────────────

function initController(gp) {
  if (initialized && activeGamepad === gp.index) return;

  console.log('Initialisiere:', gp.id);

  activeGamepad = gp.index;
  initialized   = true;

  // Status Card zurücksetzen
  document.getElementById('status-card').innerHTML = `
    <div class="status-row">
      <div class="status-dot connected" id="status-dot"></div>
      <span id="status-text">Verbunden: ${gp.id}</span>
    </div>
    <p class="hint" style="margin-top: 0.5rem">
      <button class="clear-btn"
              style="margin-top: 0.8rem; width: auto; 
                     padding: 0.4rem 1rem;"
              onclick="resetSelection()">
        🔄 Controller wechseln
      </button>
    </p>
  `;

  showCards();
  updateControllerInfo(gp);
  createButtonElements(gp.buttons.length);
  createAxesBars(gp.axes.length);

  addLog(`✅ Controller: ${gp.id}`);
  addLog(`   Tasten: ${gp.buttons.length} | Achsen: ${gp.axes.length}`);

  if (!animationId) startGameLoop();
}

// ─── Auswahl zurücksetzen ─────────────────────────────

function resetSelection() {
  // Game Loop stoppen
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  activeGamepad = null;
  initialized   = false;

  // Status Card zurücksetzen
  document.getElementById('status-card').innerHTML = `
    <div class="status-row">
      <div class="status-dot" id="status-dot"></div>
      <span id="status-text">Kein Controller verbunden</span>
    </div>
    <p class="hint">
      Verbinde deinen Controller per Bluetooth
      und drücke eine Taste
    </p>
  `;

  hideCards();
  scanForGamepads();
}

// ─── Disconnect ───────────────────────────────────────

function handleDisconnect() {
  addLog('❌ Controller getrennt');

  activeGamepad = null;
  initialized   = false;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Status Card zurücksetzen
  document.getElementById('status-card').innerHTML = `
    <div class="status-row">
      <div class="status-dot disconnected" id="status-dot"></div>
      <span id="status-text">Controller getrennt</span>
    </div>
    <p class="hint">
      Bitte Controller neu verbinden
    </p>
  `;

  hideCards();
}

// ─── Game Loop ────────────────────────────────────────

function startGameLoop() {
  function loop() {
    if (activeGamepad === null) return;

    const gamepads = navigator.getGamepads();
    const gp       = gamepads[activeGamepad];

    if (!gp) {
      handleDisconnect();
      return;
    }

    updateButtons(gp.buttons);
    updateAxes(gp.axes);

    animationId = requestAnimationFrame(loop);
  }

  animationId = requestAnimationFrame(loop);
}

// ─── Buttons ──────────────────────────────────────────

const BUTTON_NAMES = {
  0: 'A / ✕', 1: 'B / ○', 2: 'X / □', 3: 'Y / △',
  4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT',
  8: 'Select', 9: 'Start', 10: 'L3', 11: 'R3',
  12: '▲', 13: '▼', 14: '◀', 15: '▶', 16: 'Home'
};

function updateButtons(buttons) {
  buttons.forEach((button, index) => {
    const element = document.getElementById(`btn-${index}`);
    if (!element) return;

    const isPressed = button.pressed;
    const value     = button.value.toFixed(2);

    element.querySelector('.btn-value')
           .textContent = value;

    isPressed
      ? element.classList.add('pressed')
      : element.classList.remove('pressed');

    if (lastButtonState[index] !== isPressed) {
      lastButtonState[index] = isPressed;
      const name = BUTTON_NAMES[index] || `Btn ${index}`;
      addLog(
        isPressed
          ? `🔵 ${name} gedrückt`
          : `⚪ ${name} losgelassen`
      );
    }
  });
}

// ─── Achsen ───────────────────────────────────────────

const AXIS_NAMES = {
  0: 'L-X', 1: 'L-Y', 2: 'R-X', 3: 'R-Y'
};

function updateAxes(axes) {
  axes.forEach((value, index) => {
    const valueEl = document.getElementById(`axis-${index}`);
    if (valueEl) valueEl.textContent = value.toFixed(2);

    const fill = document.getElementById(`axis-fill-${index}`);
    if (fill) {
      const percent      = Math.abs(value) * 50;
      fill.style.width   = percent + '%';
      fill.style.left    = value >= 0
        ? '50%'
        : (50 - percent) + '%';
      fill.style.background = value > 0.1
        ? '#58a6ff'
        : value < -0.1
          ? '#ff7c7c'
          : '#3fb950';
    }
  });

  drawJoystick('joystick-left',  axes[0] || 0, axes[1] || 0);
  drawJoystick('joystick-right', axes[2] || 0, axes[3] || 0);
}

// ─── Joystick ─────────────────────────────────────────

function drawJoystick(canvasId, x, y) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const w      = canvas.width;
  const h      = canvas.height;
  const cx     = w / 2;
  const cy     = h / 2;
  const radius = (w / 2) - 10;

  ctx.clearRect(0, 0, w, h);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth   = 1;
  ctx.stroke();

  const dotX = cx + (x * radius);
  const dotY = cy + (y * radius);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(dotX, dotY);
  ctx.strokeStyle = '#58a6ff55';
  ctx.lineWidth   = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(dotX, dotY, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#58a6ff';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#30363d';
  ctx.fill();
}

// ─── UI Helfer ────────────────────────────────────────

function createButtonElements(count) {
  const grid     = document.getElementById('buttons-grid');
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const name     = BUTTON_NAMES[i] || `Btn ${i}`;
    grid.innerHTML += `
      <div class="btn-item" id="btn-${i}">
        <div class="btn-number">#${i}</div>
        <div class="btn-name">${name}</div>
        <div class="btn-value">0.00</div>
      </div>`;
  }
}

function createAxesBars(count) {
  const container     = document.getElementById('axes-bars');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const name          = AXIS_NAMES[i] || `Achse ${i}`;
    container.innerHTML += `
      <div class="axis-bar-row">
        <span class="axis-bar-label">${name}</span>
        <div class="axis-bar-track">
          <div class="axis-bar-fill"
               id="axis-fill-${i}"></div>
        </div>
      </div>`;
  }
}

function updateControllerInfo(gp) {
  document.getElementById('ctrl-name').textContent    = gp.id;
  document.getElementById('ctrl-index').textContent   = gp.index;
  document.getElementById('ctrl-buttons').textContent = gp.buttons.length;
  document.getElementById('ctrl-axes').textContent    = gp.axes.length;
}

function showCards() {
  ['info-card', 'buttons-card', 'axes-card', 'log-card']
    .forEach(id => document.getElementById(id)
                           .classList.remove('hidden'));
}

function hideCards() {
  ['info-card', 'buttons-card', 'axes-card', 'log-card']
    .forEach(id => document.getElementById(id)
                           .classList.add('hidden'));
}

function setStatus(connected, message) {
  const dot     = document.getElementById('status-dot');
  if (!dot) return;
  dot.className = 'status-dot ' +
    (connected ? 'connected' : 'disconnected');
  document.getElementById('status-text')
          .textContent = message;
}

function addLog(message) {
  const log      = document.getElementById('log-box');
  if (!log) return;
  const time     = new Date().toLocaleTimeString('de-DE');
  log.innerHTML += `[${time}] ${message}<br>`;
  log.scrollTop  = log.scrollHeight;
}

function clearLog() {
  document.getElementById('log-box').innerHTML = '';
}
