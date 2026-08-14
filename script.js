// Aktuelle URL holen
const currentURL = window.location.href;

// URL anzeigen
document.getElementById('page-url').textContent = currentURL;

// QR-Code generieren
new QRCode(document.getElementById('qrcode'), {
  text:            currentURL,
  width:           200,
  height:          200,
  colorDark:       '#000000',
  colorLight:      '#ffffff',
  correctLevel:    QRCode.CorrectLevel.H  // Höchste Fehlerkorrektur
});