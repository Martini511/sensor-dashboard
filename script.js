// ─── Button Namen (Standard Gamepad Layout) ───────────

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

let animationId    = null;
let activeGamepad  = null;
let lastButtonState = [];
let logEnabled     = true;

// ─── Gamepad Events ───────────────────────────────────

window.addEventListener('gamepadconnected', (event) => {
  const gp = event.gamepad;
  console.log('Controller verbunden:', gp);

  activeGamepad = gp.index;

  // UI anzeigen
  showCards();
  updateControllerInfo(gp);
  createButtonElements(gp.buttons.length);
  createAxesBars(gp.axes.length);

  // Status aktualisieren
  setStatus(true, `Verbunden: ${gp.id}`);
  addLog(`✅ Controller verbunden: ${gp.id}`);
  addLog(`   Tasten: ${gp.buttons.length} | Achsen: ${gp.axes.length}`);

  // Game Loop starten
  startGameLoop();
});

window.addEventListener('gamepaddisconnected', (event) => {
  addLog('❌ Controller getrennt');
  setStatus(false, 'Controller getrennt');
  activeGamepad = null;

  // Game Loop stoppen
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  hideCards();
});

// ─── Game Loop ────────────────────────────────────────

function startGameLoop() {
  function loop() {
    if (activeGamepad === null) return;

    // Aktuellen Gamepad Status holen
    // ⚠️ Muss in Loop neu gelesen werden!
    const gamepads = navigator.getGamepads();
    const gp       = gamepads[activeGamepad];

    if (!gp) return;

    // Buttons aktualisieren
    updateButtons(gp.buttons);

    // Achsen aktualisieren
    updateAxes(gp.axes);

    // Nächsten Frame anfordern
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

    // Visuell aktualisieren
    element.querySelector('.btn-value').textContent = value;

    if (isPressed) {
      element.classList.add('pressed');
    } else {
      element.classList.remove('pressed');
    }

    // Log bei Statusänderung
    if (lastButtonState[index] !== isPressed) {
      lastButtonState[index] = isPressed;

      if (logEnabled) {
        const name = BUTTON_NAMES[index] || `Btn ${index}`;
        addLog(
          isPressed
            ? `🔵 ${name} gedrückt (${value})`
            : `⚪ ${name} losgelassen`
        );
      }
    }
  });
}

// ─── Achsen aktualisieren ─────────────────────────────

function updateAxes(axes) {
  axes.forEach((value, index) => {
    // Wert anzeigen
    const valueEl = document.getElementById(`axis-${index}`);
    if (valueEl) {
      valueEl.textContent = value.toFixed(2);
    }

    // Balken aktualisieren
    const fill = document.getElementById(`axis-fill-${index}`);
    if (fill) {
      // Wert von -1 bis 1 auf Balken mappen
      const percent = Math.abs(value) * 50;
      fill.style.width = percent + '%';
      fill.style.left  = value >= 0
        ? '50%'
        : (50 - percent) + '%';

      // Farbe je nach Richtung
      fill.style.background = value > 0.1
        ? '#58a6ff'
        : value < -0.1
          ? '#ff7c7c'
          : '#3fb950';
    }
  });

  // Joysticks zeichnen
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
  const canvas  = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx     = canvas.getContext('2d');
  const width   = canvas.width;
  const height  = canvas.height;
  const centerX = width  / 2;
  const centerY = height / 2;
  const radius  = (width  / 2) - 10;
  const dotR    = 12;

  // Canvas leeren
  ctx.clearRect(0, 0, width, height);

  // Äußerer Kreis
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#30363d';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Kreuzlinien
  ctx.beginPath();
  ctx.moveTo(centerX - radius, centerY);
  ctx.lineTo(centerX + radius, centerY);
  ctx.moveTo(centerX, centerY - radius);
  ctx.lineTo(centerX, centerY + radius);
  ctx.strokeStyle = '#21262d';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Joystick Position berechnen
  const dotX = centerX + (x * radius);
  const dotY = centerY + (y * radius);

  // Linie vom Zentrum zum Punkt
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(dotX, dotY);
  ctx.strokeStyle = '#58a6ff55';
  ctx.lineWidth   = 2;
  ctx.stroke();

  // Joystick Punkt
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fillStyle = '#58a6ff';
  ctx.fill();

  // Zentrum Punkt
  ctx.beginPath();
  ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#30363d';
  ctx.fill();
}

// ─── UI Elemente erstellen ────────────────────────────

function createButtonElements(count) {
  const grid = document.getElementById('buttons-grid');
  grid.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const name = BUTTON_NAMES[i] || `Btn ${i}`;
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
  const container = document.getElementById('axes-bars');
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const name = AXIS_NAMES[i] || `Achse ${i}`;
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

  const dot = document.getElementById('status-dot');
  dot.className = 'status-dot ' +
    (connected ? 'connected' : 'disconnected');
}

// ─── Log ──────────────────────────────────────────────

function addLog(message) {
  const log  = document.getElementById('log-box');
  const time = new Date().toLocaleTimeString('de-DE');
  log.innerHTML += `[${time}] ${message}<br>`;
  log.scrollTop  = log.scrollHeight;
}

function clearLog() {
  document.getElementById('log-box').innerHTML = '';
}
