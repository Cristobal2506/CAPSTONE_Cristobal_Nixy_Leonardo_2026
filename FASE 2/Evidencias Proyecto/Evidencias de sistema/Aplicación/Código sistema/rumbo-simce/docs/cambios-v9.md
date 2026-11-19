# Rumbo SIMCE v9 — Resumen de cambios

**Objetivo:** videoconferencias de demostración gratuitas, sin método de pago.

- Sustituida la integración de Daily por enlaces a **Jitsi Meet público** (`https://meet.jit.si`).
- No se necesita `DAILY_API_KEY` ni tarjeta de crédito.
- El docente debe iniciar primero la sala y autenticarse con Google o GitHub en Jitsi; el alumno entra después como invitado.
- La videollamada se inicia mediante un botón de Rumbo SIMCE, pero **se reproduce en el navegador o en la app Jitsi**, no dentro de una WebView de Expo Go.
- Se conservan solicitudes, requisitos de elegibilidad, control de roles, consentimiento y registros de sesión.
- Nombres de sala aleatorios de 128 bits y validación estricta del dominio en backend y móvil.
- Se retira `react-native-webview` porque el servicio público no proporciona un modo embebido apropiado para llamadas normales.
- La migración `007_cerrar_enlaces_video_anteriores.sql` cierra las solicitudes previamente aceptadas que apuntaban a Daily. En una instalación nueva, no tiene efecto.
- Pruebas del proveedor `videoProvider.test.js`; suite de integración `videollamadas.test.js` adaptada a Jitsi.

## Limitaciones críticas (NO producción)

- Jitsi público **no garantiza privacidad por rol ni que solo entren dos participantes**: cualquiera con el enlace podría entrar. Un nombre largo y aleatorio no es autenticación de usuario.
- Marcar la solicitud como terminada **no cierra ni destruye la reunión en Jitsi**. Ambos participantes deben salir manualmente. Los enlaces ya copiados podrían reutilizarse.
- El primer participante debe autenticarse para iniciar la reunión.
- El contenido pedagógico de diagnóstico/examen no está implementado; solo el acompañamiento por video.
- El consentimiento aún necesita actualizarse para el tratamiento de audio/video por un proveedor externo.
- Probar **solo con adultos y datos ficticios**. Para usarlo con niños se necesita servicio privado con autenticación individual, controles de sala y revisión legal.

## Verificaciones locales hechas durante la preparación

- Sintaxis JS del backend comprobada (`node --check`).
- TSX de la pantalla de video analizado sintácticamente.
- Pruebas unitarias directas del proveedor: nombre aleatorio, URLs autorizadas/rechazadas y cierre lógico.
- **No** se ejecutó Jest con PostgreSQL ni videollamada real entre dos teléfonos en el entorno de creación; deben comprobarse siguiendo la guía.
