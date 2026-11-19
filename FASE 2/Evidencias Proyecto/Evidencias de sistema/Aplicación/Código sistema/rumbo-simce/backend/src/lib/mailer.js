// Envío de correos (CU07). El proveedor se define por variables de entorno (SMTP_*),
// así se puede usar Gmail, Brevo, SendGrid, Mailtrap, etc. sin tocar el código.
//   - Con SMTP_HOST:            envía por SMTP.
//   - Sin SMTP_HOST (desarrollo): muestra el correo en la consola de la API.
//   - En pruebas (NODE_ENV=test): guarda los correos en memoria (`bandejaPrueba`).
const nodemailer = require('nodemailer');
const config = require('../config');

const bandejaPrueba = [];
let transporte = null;

function obtenerTransporte() {
  if (!transporte && config.mail.host) {
    transporte = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.port === 465,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  }
  return transporte;
}

async function enviarCorreo({ para, asunto, texto, html }) {
  if (config.env === 'test') {
    bandejaPrueba.push({ para, asunto, texto });
    return;
  }
  const t = obtenerTransporte();
  if (!t) {
    console.log(`\n✉️  [correo de desarrollo] Para: ${para}\n   Asunto: ${asunto}\n   ${texto.replace(/\n/g, '\n   ')}\n`);
    return;
  }
  await t.sendMail({ from: config.mail.from, to: para, subject: asunto, text: texto, html });
}

function correoRecuperacion({ nombre, codigo, minutos }) {
  const texto = [
    `Hola, ${nombre}:`,
    '',
    'Recibimos una solicitud para restablecer tu contraseña de Rumbo SIMCE.',
    `Tu código es: ${codigo}`,
    '',
    `Escríbelo en la aplicación. Vence en ${minutos} minutos y sirve una sola vez.`,
    'Si no fuiste tú, ignora este correo: tu contraseña no cambiará.',
  ].join('\n');
  const html = `
    <div style="font-family:Arial,sans-serif;font-size:16px;color:#1B2733;max-width:480px">
      <p>Hola, ${escaparHtml(nombre)}:</p>
      <p>Recibimos una solicitud para restablecer tu contraseña de <b>Rumbo SIMCE</b>.</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#2E4A62">${codigo}</p>
      <p>Escríbelo en la aplicación. Vence en ${minutos} minutos y sirve una sola vez.</p>
      <p style="color:#4A5A6A">Si no fuiste tú, ignora este correo: tu contraseña no cambiará.</p>
    </div>`;
  return { asunto: 'Tu código para restablecer la contraseña', texto, html };
}

const escaparHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

module.exports = { enviarCorreo, correoRecuperacion, bandejaPrueba };
