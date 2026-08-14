// ─── Variablen ────────────────────────────────────────

let port       = null;
let reader     = null;
let isReading  = false;

// ─── Browser Check ────────────────────────────────────

window.addEventListener('load', () => {
  if (!('serial' in navigator)) {
    document.getElementById('browser-warning')
            .style.display = 'block';
    document.getElementById('connect-btn')
            .disabled = true;
  }
  generateQRCode();
});

// ─── Serial Verbindung ────────────────────────────────

async function connectSerial() {
  // Trennen wenn bereits verbunden
  if (port) {
    await disconnectSerial();
    return;
  }

  try {
    updateStatus('Wähle Port...', 'searching');

    // Port auswählen - Browser zeigt Dialog
    port = await navigator.serial.requestPort();

    // Port öffnen
    // ⚠️ BaudRate muss mit Board übereinstimmen!
    await port.open({ baudRate: 115200 });

    updateStatus('Verbunden', 'connected');
    updateConnectButton(true);
    addLog('✅ Verbunden!');

    // Daten lesen starten
    isReading = true;
    readSerialData();

  } catch (error) {
    updateStatus('Fehler: ' + error.message, 'error');
    addLog('❌ Fehler: ' + error.message);
    port = null;
  }
}

async function disconnectSerial() {
  try {
    isReading = false;

    if (reader) {
      await reader.cancel();
      reader = null;
    }

    if (port) {
      await port.close();
      port = null;
    }

    updateStatus('Nicht verbunden', '');
    updateConnectButton(false);
    addLog('🔌 Verbindung getrennt');

  } catch (error) {
    addLog('❌ Trennfehler: ' + error.message);
  }
}

// ─── Daten lesen ──────────────────────────────────────

async function readSerialData() {
  // Text Decoder für Serial Daten
  const decoder    = new TextDecoderStream();
  const readStream = port.readable.pipeTo(decoder.writable);
  reader           = decoder.readable.getReader();

  let buffer = '';

  try {
    while (isReading) {
      const { value, done } = await reader.read();

      if (done) break;
      if (!value) continue;

      // Zeichen zum Buffer hinzufügen
      buffer += value;

      // Auf komplette Zeilen warten
      const lines = buffer.split('\n');

      // Letzte unvollständige Zeile im Buffer behalten
      buffer = lines.pop();

      // Jede komplette Zeile verarbeiten
      lines.forEach(line => {
        line = line.trim();
        if (line) {
          addLog('📥 ' + line);
          parseSensorData(line);
        }
      });
    }
  } catch (error) {
    if (isReading) {
      addLog('❌ Lesefehler: ' + error.message);
      updateStatus('Verbindung verloren', 'error');
    }
  }
}

// ─── Daten parsen ─────────────────────────────────────

function parseSensorData(line) {
  // Erwartet JSON vom Board:
  // {"temp":22.5,"hum":60,"light":800}
  try {
    const data = JSON.parse(line);

    if (data.temp !== undefined) {
      document.getElementById('temp').textContent =
        parseFloat(data.temp).toFixed(1);
    }
    if (data.hum !== undefined) {
      document.getElementById('hum').textContent =
        parseFloat(data.hum).toFixed(0);
    }
    if (data.light !== undefined) {
      document.getElementById('light').textContent =
        parseInt(data.light);
    }

  } catch {
    // Kein JSON - einfache Textnachricht
    // Wird nur im Log angezeigt
  }
}

// ─── UI Funktionen ────────────────────────────────────

function updateConnectButton(connected) {
  const btn = document.getElementById('connect-btn');
  btn.textContent = connected ?
    '🔴 Verbindung trennen' :
    '🔌 Mit Board verbinden';
  btn.className = connected ? 'connected' : '';
}

function updateStatus(message, type) {
  document.getElementById('status-text')
          .textContent = message;

  const dot = document.getElementById('status-dot');
  dot.className = 'status-dot';
  if (type === 'connected') dot.classList.add('connected');
  if (type === 'error')     dot.classList.add('error');
}

function addLog(message) {
  const log  = document.getElementById('serial-log');
  const time = new Date().toLocaleTimeString('de-DE');
  log.innerHTML += `[${time}] ${message}<br>`;
  log.scrollTop  = log.scrollHeight;
}

function clearLog() {
  document.getElementById('serial-log').innerHTML = '';
}

// ─── QR Code ──────────────────────────────────────────

function generateQRCode() {
  const url = window.location.href;
  document.getElementById('page-url').textContent = url;

  new QRCode(document.getElementById('qrcode'), {
    text:         url,
    width:        200,
    height:       200,
    colorDark:    '#000000',
    colorLight:   '#ffffff',
    correctLevel: QRCode.CorrectLevel.H
  });
}
