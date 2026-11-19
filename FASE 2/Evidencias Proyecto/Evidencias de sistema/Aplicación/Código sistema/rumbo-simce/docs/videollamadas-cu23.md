# Rumbo SIMCE — Videollamadas con Jitsi Meet (prototipo v9)

## Alcance

Los CU20/CU22/CU23/CU24 conservan la logica de solicitudes y permisos de v8. El alumno solicita `diagnostico` antes de su primera tanda, `ayuda` tras tres intentos sin dominar (configurable), o `cierre_nivel` al terminar un nivel. El docente asignado acepta; luego ambos pueden abrir el mismo enlace.

## Proveedor gratuito y funcionamiento real

- **Jitsi Meet publico**, `https://meet.jit.si`, sin API key y sin tarjeta.
- La API de Rumbo SIMCE genera el nombre de sala con 128 bits aleatorios al aceptar la solicitud y solo devuelve el enlace a los dos roles autorizados, mientras siga aceptada y exista consentimiento.
- **EL ENLACE NO ES UNA SALA PRIVADA AUTENTICADA POR JITSI:** cualquiera que lo conozca podria entrar. No hay tokens, limite garantizado a dos participantes ni revocacion de acceso en el servidor Jitsi.
- **Inicia el docente primero**: para crear la reunion en el servidor publico Jitsi pide iniciar sesion con una cuenta Google o GitHub, sin tarjeta; el alumno entra despues como invitado.
- La aplicacion abre Jitsi en navegador o app Jitsi (por `Linking.openURL`), no dentro de WebView. La version embebida del servicio publico no es adecuada para llamadas prolongadas y la captura de camara en Expo Go no es confiable.
- Al pulsar **Marcar sesion como terminada**, se cierra el estado en Rumbo SIMCE y la API deja de entregar el enlace. **No expulsa a participantes de Jitsi ni elimina el enlace:** ambos deben salir manualmente de la reunion. El enlace podria seguir funcionando si fue copiado.
- No se integra grabacion ni almacenamiento de audio/video en la BD de Rumbo SIMCE. El servicio publico opera bajo sus propias condiciones de uso.

## Seguridad y limitaciones

**SOLO PARA PRUEBAS CON ADULTOS, cuentas ficticias y sin datos reales de menores.** El consentimiento no incorpora suficientemente el tratamiento por Jitsi. Para produccion haria falta una instancia propia o proveedor con autenticacion por participante (JWT), permisos, lobby/contraseña, revocacion, limites, politica de datos y consentimiento adecuado. `meet.jit.si` es para demostraciones y no para integraciones de produccion.

## API (no cambia el contrato basico)

- `GET /api/videollamadas/opciones` - estudiante consulta motivos habilitados.
- `GET /api/videollamadas` - alumno o docente consulta solicitudes propias.
- `POST /api/videollamadas` - estudiante solicita `diagnostico`, `ayuda` o `cierre_nivel`.
- `POST /api/videollamadas/:id/aceptar` - docente asignado acepta y registra el enlace Jitsi aleatorio.
- `GET /api/videollamadas/:id/acceso` - alumno/docente autenticados reciben `url`, `proveedor: "jitsi"` y `requiereModerador: true` (sin tokens externos).
- `POST /api/videollamadas/:id/cancelar` - estudiante cancela solicitud pendiente.
- `POST /api/videollamadas/:id/finalizar` - participante marca solicitud finalizada en Rumbo SIMCE.

## Pruebas

- Pruebas de servicios Jest sin llamadas externas en `backend/tests/videoProvider.test.js`.
- Pruebas de permisos e integracion con PostgreSQL en `backend/tests/videollamadas.test.js`.
- Pruebas fisicas con dos telefonos segun la `Rumbo_SIMCE_Guia_Instalacion_y_Pruebas_v9.pdf` adjunta a la entrega.

## Referencias oficiales

- https://jitsi.org/api/ (meet.jit.si, solo pruebas de integracion, no produccion)
- https://jitsi.org/blog/authentication-on-meet-jit-si/ (inicio de reunion con cuenta del moderador)
- https://jitsi.org/meet-jit-si-terms-of-service/ (limites, condiciones y privacidad del servicio)
