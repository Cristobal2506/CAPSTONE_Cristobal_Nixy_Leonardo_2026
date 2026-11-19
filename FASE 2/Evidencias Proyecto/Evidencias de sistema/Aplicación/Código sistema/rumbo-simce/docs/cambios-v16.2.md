# Rumbo SIMCE v16.2 — La app gira con la tablet

**Fecha:** 15 de noviembre de 2026 · **Base:** v16.1 · **Requiere APK nueva:** sí, porque cambia el manifiesto de Android.

## Cambio

En `mobile/app.json`, `"orientation"` pasa de `"portrait"` a `"default"`.

- **Antes:** la app estaba fijada en vertical. Al girar una tablet, Android la mostraba como una franja angosta en el centro, con el fondo de pantalla a los lados.
- **Ahora:** la app gira con la tablet y ocupa toda la pantalla en horizontal y en vertical. El manifiesto generado lleva `android:screenOrientation="unspecified"`.

Se revisaron en horizontal (1280 × 800) la bienvenida, el camino, las pruebas, la pantalla de prueba entregada y la respuesta escrita: el contenido usa todo el ancho y nada queda tapado.

## Cómo actualizar

1. Borra la carpeta `mobile\android`.
2. Ejecuta `npm run prebuild:android`.
3. Compila la APK.
4. Desinstala la app antigua de la tablet (`adb uninstall cl.rumbosimce.app`) e instala la nueva.

El backend y la base de datos no cambian.
