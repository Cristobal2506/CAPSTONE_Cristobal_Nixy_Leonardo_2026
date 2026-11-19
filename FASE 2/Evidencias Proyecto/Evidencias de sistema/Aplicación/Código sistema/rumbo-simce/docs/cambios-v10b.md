# Cambios v10b (a partir de v9)

- Se mantiene el backend y la logica CU20/CU22/CU23/CU24 de solicitudes de v9.
- El boton de ingreso a videollamadas recupera la URL desde la API y usa un modulo local Kotlin que inicia `JitsiMeetActivity` dentro del APK.
- SDK Jitsi Android fijado en `org.jitsi.react:jitsi-meet-sdk:13.1.1`, igual al laboratorio Kotlin validado de forma independiente en dos telefonos.
- Se utiliza el sistema Expo 57/React Native 0.86 de v9; **la compatibilidad combinada con el SDK de Jitsi todavia NO ha sido confirmada**. Existe riesgo de clases duplicadas y dependencias conflictivas.
- Se necesita una compilacion Android propia, no Expo Go. Se incluye plugin que aplica `minSdk=26`, repositorios Maven y resoluciones del manifest tras `expo prebuild --clean`.
- El enlace y las credenciales nunca se codifican en la app: vienen de la API tras su verificacion de permisos. La URL se valida tambien en Kotlin.
- El servidor de prueba sigue siendo `meet.jit.si` con sus limitaciones de autenticacion, privacidad y disponibilidad.
- No se incorpora el diagnostico pedagogico ni la evaluacion final automatizada; unicamente el acceso a videollamada para esas instancias.
- Documentacion de instalacion completa: `docs/guia-instalacion-y-pruebas-v10b.md`.
