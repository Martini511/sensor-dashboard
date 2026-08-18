// ─── Variablen ────────────────────────────────────────

let animationId     = null;
let activeGamepad   = null;
let lastButtonState = [];
let initialized     = false;

// ─── Infineon Farbpalette ─────────────────────────────

const IFX = {
  ocean:     '#12a190',
  oceanSoft: 'rgba(18, 161, 144, 0.35)',
  orange:    '#f0803c',
  grey300:   '#3a3d42',
  grey100:   '#1f2124',
  grey500:   '#6d6f75'
};

// ─── Beim Laden ───────────────────────────────────────

window.addEventListener('load', () => {
  initNavigation();
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

// ─── Navigation ───────────────────────────────────────

const SECTION_IDS = [
  'pad-card', 'axes-card', 'buttons-card', 'log-card'
];

function initNavigation() {
  const links = document.querySelectorAll('.ifx-nav-item');

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const id     = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();

      // Nur den gewählten Reiter offen lassen
      SECTION_IDS.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        if (section) section.open = (sectionId === id);
      });

      links.forEach(item =>
        item.classList.toggle('is-active', item === link));

      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ─── Alle Controller anzeigen zur Auswahl ─────────────

// ─── Aktiv nach Gamepads suchen ───────────────────────

// Nur Geräte mit diesem Profil werden akzeptiert
const REQUIRED_BUTTONS = 16;
const REQUIRED_AXES    = 4;

function isSupportedGamepad(gp) {
  return gp.buttons.length === REQUIRED_BUTTONS
      && gp.axes.length    === REQUIRED_AXES;
}

function scanForGamepads() {
  const gamepads = navigator.getGamepads();
  const found    = [];

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (gp === null) continue;

    if (!isSupportedGamepad(gp)) {
      console.log(
        'Nicht unterstütztes Gerät:', gp.id,
        `(${gp.buttons.length} Tasten / ${gp.axes.length} Achsen)`
      );
      continue;
    }

    found.push(gp);
    console.log('Controller gefunden:', gp.id);
  }

  if (found.length === 0) {
    setStatus(false, 'Kein kompatibler Controller gefunden');
    return;
  }

  // Ersten gültigen Controller nehmen
  initController(found[0]);
}

// ─── Auswahl Dialog ───────────────────────────────────

function showControllerSelection(gamepads) {
  // Status Card leeren
  const statusCard = document.getElementById('status-card');

  statusCard.innerHTML = `
    <p class="select-title">Eingabegerät auswählen</p>
    <p class="select-subtitle">
      Es wurden mehrere Geräte erkannt.
      Bitte wählen Sie das gewünschte Gerät aus.
    </p>
    <div id="controller-list"></div>
  `;

  const list = document.getElementById('controller-list');

  gamepads.forEach((gp) => {
    const item     = document.createElement('div');
    item.className = 'controller-item';

    const info       = document.createElement('div');
    info.className   = 'ctrl-item-info';

    const index      = document.createElement('span');
    index.className  = 'ctrl-item-index';
    index.textContent = `Index ${gp.index}`;

    const name       = document.createElement('span');
    name.className   = 'ctrl-item-name';
    name.textContent = gp.id;

    const details    = document.createElement('span');
    details.className = 'ctrl-item-details';
    details.textContent =
      `${gp.buttons.length} Tasten | ${gp.axes.length} Achsen`;

    info.append(index, name, details);

    const button       = document.createElement('button');
    button.className   = 'select-btn';
    button.textContent = 'Verbinden';
    button.addEventListener('click',
      () => selectController(gp.index));

    item.append(info, button);
    list.appendChild(item);
  });
}

// ─── Controller auswählen ─────────────────────────────

function selectController(index) {
  const gamepads = navigator.getGamepads();
  const gp       = gamepads[index];

  if (gp && isSupportedGamepad(gp)) {
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
      <span id="status-text"></span>
    </div>
    <p class="hint">
      Die Datenerfassung läuft. Alle Werte werden in Echtzeit
      aktualisiert.
    </p>
  `;

  document.getElementById('status-text')
          .textContent = `Verbunden – ${gp.id}`;

  showCards();

  const padDevice = document.getElementById('pad-device');
  if (padDevice) padDevice.textContent = gp.id;

  createButtonElements(gp.buttons.length);
  createAxesBars(gp.axes.length);

  addLog(`[OK]  Gerät verbunden: ${gp.id}`);
  addLog(`      Tasten: ${gp.buttons.length} | Achsen: ${gp.axes.length}`);

  if (!animationId) startGameLoop();
}

// ─── Disconnect ───────────────────────────────────────

function handleDisconnect() {
  addLog('[!]   Verbindung zum Gerät getrennt');

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
      <span id="status-text">Verbindung getrennt</span>
    </div>
    <p class="hint">
      Bitte verbinden Sie das Gerät erneut.
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
  0: 'F', 1: 'X', 2: 'I', 3: 'T',
  4: 'L1', 5: 'R1', 6: 'L2', 7: 'R2',
  8: 'Select', 9: 'Start', 10: 'L3', 11: 'R3',
  12: 'D-Pad ▲', 13: 'D-Pad ▼',
  14: 'D-Pad ◀', 15: 'D-Pad ▶',
  16: 'Control'
};

// Analoge Trigger in der Controller-Grafik
const TRIGGER_GEOMETRY = {
  6: { y: 18, height: 68 },
  7: { y: 18, height: 68 }
};

function updateButtons(buttons) {
  buttons.forEach((button, index) => {
    const isPressed = button.pressed;
    const value     = button.value;

    updatePadButton(index, isPressed, value);

    const element = document.getElementById(`btn-${index}`);
    if (!element) return;

    element.querySelector('.btn-value')
           .textContent = value.toFixed(2);

    isPressed
      ? element.classList.add('pressed')
      : element.classList.remove('pressed');

    if (lastButtonState[index] !== isPressed) {
      lastButtonState[index] = isPressed;
      const name = BUTTON_NAMES[index] || `Btn ${index}`;
      addLog(
        isPressed
          ? `[IN]  ${name} — gedrückt`
          : `[IN]  ${name} — losgelassen`
      );
    }
  });
}

// ─── Controller-Grafik ───────────────────────────────

function updatePadButton(index, isPressed, value) {
  const pad = document.getElementById(`pad-${index}`);
  if (!pad) return;

  pad.classList.toggle('is-pressed', isPressed);

  const geometry = TRIGGER_GEOMETRY[index];
  const fill     = document.getElementById(`trigger-fill-${index}`);

  if (geometry && fill) {
    const filled = geometry.height * value;
    fill.setAttribute('height', filled);
    fill.setAttribute('y', geometry.y + geometry.height - filled);
  }
}

function updateStick(elementId, x, y) {
  const stick = document.getElementById(elementId);
  if (!stick) return;

  stick.setAttribute(
    'transform',
    `translate(${(x * 16).toFixed(2)} ${(y * 16).toFixed(2)})`
  );
}

// ─── Achsen ───────────────────────────────────────────

const AXIS_NAMES = {
  0: 'Links X', 1: 'Links Y',
  2: 'Rechts X', 3: 'Rechts Y'
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
        ? IFX.ocean
        : value < -0.1
          ? IFX.orange
          : IFX.grey500;
    }
  });

  drawJoystick('joystick-left',  axes[0] || 0, axes[1] || 0);
  drawJoystick('joystick-right', axes[2] || 0, axes[3] || 0);

  updateStick('stick-left-move',  axes[0] || 0, axes[1] || 0);
  updateStick('stick-right-move', axes[2] || 0, axes[3] || 0);
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
  ctx.strokeStyle = IFX.grey300;
  ctx.lineWidth   = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - radius, cy);
  ctx.lineTo(cx + radius, cy);
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx, cy + radius);
  ctx.strokeStyle = IFX.grey300;
  ctx.lineWidth   = 1;
  ctx.stroke();

  const dotX = cx + (x * radius);
  const dotY = cy + (y * radius);

  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(dotX, dotY);
  ctx.strokeStyle = IFX.oceanSoft;
  ctx.lineWidth   = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(dotX, dotY, 11, 0, Math.PI * 2);
  ctx.fillStyle = IFX.ocean;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fillStyle = IFX.grey500;
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

function showCards() {
  ['pad-card', 'buttons-card', 'axes-card', 'log-card']
    .forEach(id => document.getElementById(id)
                           .classList.remove('hidden'));
}

function hideCards() {
  ['pad-card', 'buttons-card', 'axes-card', 'log-card']
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
  const log = document.getElementById('log-box');
  if (!log) return;

  const time  = new Date().toLocaleTimeString('de-DE');
  const entry = document.createElement('div');
  entry.textContent = `[${time}] ${message}`;

  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

function clearLog() {
  document.getElementById('log-box').textContent = '';
}
