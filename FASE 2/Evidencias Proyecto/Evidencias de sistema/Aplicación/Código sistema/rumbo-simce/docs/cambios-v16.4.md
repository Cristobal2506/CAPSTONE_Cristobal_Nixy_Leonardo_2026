# Cambios v16.4 — Nuevo logo (cuaderno) y textos de "estudiar"

## Logo nuevo
Concepto "cuaderno": hoja cuadriculada con margen rojo, un signo `=` (color cordillera `#2E4A62`) y un ✓ verde (color pasto `#3E8E5E`).

Archivos reemplazados en `mobile/assets/`:
- `icon.png` (1024 px) — ícono general.
- `android-icon-background.png` — capa de fondo del ícono adaptativo (hoja cuadriculada).
- `android-icon-foreground.png` — capa frontal (`=` y ✓), dentro de la zona segura central.
- `android-icon-monochrome.png` — versión de un color para íconos temáticos de Android 13+.
- `splash-icon.png` — logo de la pantalla de carga.
- `favicon.png`.
- Nuevo: `logo.png` — logo mostrado en la pantalla de Bienvenida (reemplaza el emoji 🦅).

## Pantalla de carga (splash)
- Se agrega `expo-splash-screen` (~57.0.11) y su plugin en `app.json`: logo de 200 px sobre fondo `#E8F3FB` (color cielo).
- `android.adaptiveIcon.backgroundColor` pasa a `#F7F4EC` (color papel).
- Requiere `npm install` y volver a generar el proyecto nativo (`npm run prebuild:android`). En builds de desarrollo la pantalla de carga puede verse la de `expo-dev-client`; el splash real se ve en builds preview/producción.

## Textos
- Bienvenida: "¿Quién va a jugar hoy?" → "¿Quién va a estudiar hoy?"
- Login estudiante: "¿Quién va a jugar?" → "¿Quién va a estudiar?"
