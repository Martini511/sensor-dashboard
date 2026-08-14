// ─── Button Namen ─────────────────────────────────────

const BUTTON_NAMES = {
  0:  'A / ✕',
  1:  'B / ○',
  2:  'X / □',
  3:  'Y / △',
  4:  'LB',
  5:  'RB',
  6:  'LT',
  7:  'RT',
  8:  'Select',
  9:  'Start',
  10: 'L3',
  11: 'R3',
  12: '▲',
  13: '▼',
  14: '◀',
  15: '▶',
  16: 'Home'
};

const AXIS_NAMES = {
  0: 'L-X',
  1: 'L-Y',
  2: 'R-X',
  3: 'R-Y'
};

// ─── Variablen ────────────────────────────────────────

let animationId     = null;
let activeGamepad   = null;
let lastButtonState = [];
let initialized     = false;

// ─── Beim Laden sofort suchen ─────────────────────────

window.addEventListener('load', () => {
  // Sofort prüfen
  scanForGamepads();

  // Alle 1000ms erneut prüfen
  // falls Controller erst später verbunden
  setInterval(scanForGamepads, 1000);
});

// ─── Gamepad Events ───────────────────────────────────

window.addEventListener('gamepadconnected', (event) => {
  console.log('gamepadconnected Event:', event.gamepad);
  initController(event.gamepad);
});

window.addEventListener('gamepaddisconnected', (event) => {
  console.log('gamepaddisconnected Event:', event.gamepad);
  
  if (activeGamepad === event.gamepad.index) {
    handleDisconnect();
  }
});

// ─── Aktiv nach Gamepads suchen ───────────────────────

function scanForGamepads() {
  const gamepads = navigator.getGamepads();

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];

    // Prüfen ob echter Controller
    if (gp !== null && gp.axes.length > 0) {

      // Noch nicht initialisiert?
      if (activeGamepad === null) {
        console.log('Controller gefunden:', gp.id);
        initController(gp);
        return;
      }
    }
  }
}

// ─── Controller initialisieren ────────────────────────

function initController(gp) {
  // Verhindere doppelte Initialisierung
  if (initialized && activeGamepad === gp.index) return;

  console.log('Initialisiere Controller:', gp.id);
  console.log('Buttons:', gp.buttons.length);
  console.log('Achsen:', gp.axes.length);

  activeGamepad = gp.index;
  initialized   = true;

  // UI aufbauen
  showCards();
  updateControllerInfo(gp);
  createButtonElements(gp.buttons.length);
  createAxesBars(gp.axes.length);

  // Status setzen
  setStatus(true, `Verbunden: ${gp.id}`);
  addLog(`✅ Controller: ${gp.id}`);
  addLog(`   Index: ${gp.index}`);
  addLog(`   Tasten: ${gp.buttons.length}`);
  addLog(`   Achsen: ${gp.axes.length}`);

  // Game Loop starten
  if (!animationId) startGameLoop();
}

// ─── Disconnect behandeln ─────────────────────────────

function handleDisconnect() {
  addLog('❌ Controller getrennt');
  setStatus(false, 'Controller getrennt');

  activeGamepad = null;
  initialized   = false;

  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

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

// ─── Buttons aktualisieren ────────────────────────────

function updateButtons(buttons) {
  buttons.forEach((button, index) => {
    const element = document.getElementById(`btn-${index}`);
    if (!element) return;

    const isPressed = button.pressed;
    const value     = button.value.toFixed(2);

    element.querySelector('.btn-value')
           .textContent = value;

    if (isPressed) {
      element.classList.add('pressed');
    } else {
      element.classList.remove('pressed');
    }

    // Log bei Änderung
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

// ─── Achsen aktualisieren ─────────────────────────────

function updateAxes(axes) {
  axes.forEach((value, index) => {
    // Wert Text
    const valueEl = document.getElementById(`axis-${index}`);
    if (valueEl) {
      valueEl.textContent = value.toFixed(2);
    }

    // Balken
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

  // Joysticks
  drawJoystick('joystick-left',
    axes[0] || 0,
    axes[1] || 0
  );
  drawJoystick('joystick-right',
    axes[2] || 0,
    axes[3] || 0
  );
}

// ─── Joystick zeichnen ────────────────────────────────

function drawJoystick(canvasId, x, y) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx     = canvas.getContext('2d');
  const w       = canvas.width;
  const h       = canvas.height;
  const cx      = w / 2;
  const cy      = h / 2;
  const radius  = (w / 2) - 10;
  const dotR    = 12;

  ctx.clearRect(0, 0, w, h);

  // Äußerer Kreis
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Kreuzlinien
  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Linie Zentrum → Punkt
  const dotX = cx + (x * radius);
  const dotY = cy + (y * radius);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(dotX, dotY);
  ctx.strokeStyle = '#58a6ff55';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Joystick Punkt
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fillStyle = '#58a6ff';
  ctx.fill();

  // Zentrum
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#30363d';
  ctx.fill();
}

// ─── UI Elemente erstellen ────────────────────────────

function createButtonElements(count) {
  const grid    = document.getElementById('buttons-grid');
  grid.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const name     = BUTTON_NAMES[i] || `Btn ${i}`;
    grid.innerHTML += `
      <div class="btn-item" id="btn-${i}">
        <div class="btn-number">#${i}</div>
        <div class="btn-name">${name}</div>
        <div class="btn-value">0.00</div>
      </div>
    `;
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
               id="axis-fill-${i}">
          </div>
        </div>
      </div>
    `;
  }
}

function updateControllerInfo(gp) {
  document.getElementById('ctrl-name').textContent =
    gp.id;
  document.getElementById('ctrl-index').textContent =
    gp.index;
  document.getElementById('ctrl-buttons').textContent =
    gp.buttons.length;
  document.getElementById('ctrl-axes').textContent =
    gp.axes.length;
}

// ─── Karten anzeigen/verstecken ───────────────────────

function showCards() {
  ['info-card', 'buttons-card',
   'axes-card', 'log-card'].forEach(id => {
    document.getElementById(id)
            .classList.remove('hidden');
  });
}

function hideCards() {
  ['info-card', 'buttons-card',
   'axes-card', 'log-card'].forEach(id => {
    document.getElementById(id)
            .classList.add('hidden');
  });
}

// ─── Status ───────────────────────────────────────────

function setStatus(connected, message) {
  document.getElementById('status-text')
          .textContent = message;
  const dot       = document.getElementById('status-dot');
  dot.className   = 'status-dot ' +
    (connected ? 'connected' : 'disconnected');
}

// ─── Log ──────────────────────────────────────────────

function addLog(message) {
  const log      = document.getElementById('log-box');
  const time     = new Date().toLocaleTimeString('de-DE');
  log.innerHTML += `[${time}] ${message}<br>`;
  log.scrollTop  = log.scrollHeight;
}

function clearLog() {
  document.getElementById('log-box').innerHTML = '';
}
