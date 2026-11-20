# Rumbo SIMCE

**Aplicación móvil de preparación para el SIMCE de Matemática de 4° básico, basada en el método Kumon.**

Proyecto APT · Asignatura Capstone (PTY4614) · Ingeniería en Informática, Duoc UC, sede Padre Alonso de Ovalle
Cliente: **Triskel Edu** · Versión final: **v16.4** (noviembre 2026)

---

## Equipo

| Integrante | Correo |
|---|---|
| Cristóbal Muñoz | cra.munozr@duocuc.cl |
| Nixy Silva | nix.silva@duocuc.cl |
| Leonardo Figueroa | leo.figueroa@duocuc.cl |

**Docente:** Arturo Vargas

---

## Qué es Rumbo SIMCE

Rumbo SIMCE ayuda a estudiantes de 4° básico a prepararse para el SIMCE de Matemática con práctica diaria, corta y progresiva. Une dos cosas:

| Capa | Qué define | En la app |
|---|---|---|
| **Método (Kumon)** | *Cómo* se practica | Secuencia fija de lecciones, ejemplo resuelto en cada hoja, tanda diaria de la misma dosis, corregir hasta dejar todo correcto, avanzar solo al dominar (todo correcto dentro del tiempo estándar) |
| **Contenido (SIMCE)** | *Qué* se practica | Objetivos de aprendizaje de Matemática de 4° básico, cada lección etiquetada con su objetivo |

El estudiante **escribe sus respuestas con el dedo o con el lápiz de la tablet**, y la app reconoce el número. Así se practica como en una hoja de papel y no adivinando entre alternativas.

### Funcionalidades principales

- **Diagnóstico inicial** que fija el punto de partida del estudiante.
- **Mi camino**: progresión lineal por **32 lecciones** (320 ejercicios originales) agrupadas en cinco unidades.
- **Tanda diaria** al estilo Kumon. No hay feedback mientras se responde. Al tocar «Revisar», los ejercicios incorrectos se marcan sin mostrar la respuesta y el estudiante los corrige. El servidor mide el tiempo.
- **Motor de progresión**: avanzar, repetir o retroceder según acierto y tiempo. Tras varios intentos sin alcanzar el estándar, el sistema marca «requiere profesor».
- **Respuesta escrita a mano**: un lector de dígitos (red neuronal entrenada con MNIST y ejecutada con ONNX Runtime en el propio servidor) lee enteros, decimales y fracciones. El estudiante confirma o corrige la lectura antes de guardarla.
- **Cinco pruebas de unidad y un ensayo final**, revisados y autorizados por el docente, que ve la escritura original del estudiante.
- **Videollamada integrada** (LiveKit) con el profesor. La inicia el apoderado, queda registrada y no hay chat privado con el menor.
- **Paneles de progreso** para apoderado y docente, con estado por lección e historial de evaluaciones.
- **Notificaciones** para avisos al apoderado y revisiones pendientes.
- **Banco de preguntas** administrable: cada distractor declara el error típico que lo explica.

### Perfiles

| Perfil | Cómo entra | Qué hace |
|---|---|---|
| Estudiante | Avatar + PIN de 4 dígitos (la primera vez, código de acceso + PIN) | Diagnóstico, tandas diarias, pruebas, progreso |
| Apoderado | Correo y contraseña | Crea y vincula al estudiante, da el consentimiento, ve el progreso, agenda videollamadas |
| Docente / profesor | Correo y contraseña | Cursos, revisión de pruebas, autorización de paso de nivel, videollamadas |
| Administrador | Correo y contraseña | Banco de preguntas |

---

## Arquitectura y stack

Arquitectura cliente-servidor en tres capas: app móvil, API REST y base de datos relacional.

| Capa | Tecnología |
|---|---|
| App móvil | Expo SDK 57 · React Native 0.86 · TypeScript · `expo-secure-store` |
| API | Node.js 22 · Express 5 · JWT · Zod · Helmet · bcrypt |
| Base de datos | PostgreSQL 16 (14 migraciones y 11 semillas versionadas) |
| Reconocimiento de escritura | CNN de dígitos (PyTorch → ONNX) · `onnxruntime-web` en un hilo aparte |
| Videollamadas | LiveKit (LiveKit Cloud, capa gratuita) |
| Correo | Nodemailer (sin SMTP configurado, los correos se muestran en la consola) |
| Pruebas | Jest + Supertest |
| CI | GitHub Actions (pruebas de la API con PostgreSQL y verificación de tipos de la app) |

---

## Estructura del repositorio

```
├── FASE 1/
│   ├── Anexos/
│   │   ├── Diseño/         # Requerimientos, casos de uso, diagramas, arquitectura, mockups
│   │   └── Gestión/        # Carta Gantt, matriz RACI, plan de riesgos
│   └── Documentos Administrativos/   # Informe Fase 1, autoevaluaciones y diarios de reflexión
│
└── FASE 2/
    ├── Evidencias Grupales/          # Guías de desarrollo e informe final APT
    ├── Evidencias Individuales/      # Diarios de reflexión Fase 2
    └── Evidencias Proyecto/
        ├── Presentacion Proyecto.pptx
        ├── ANEXOS/                   # Manual de usuario, instructivo de instalación, plan de pruebas, Gantt
        ├── Evidencias de documentacion/   # Diagramas y planillas de CU, actividad, RF y RNF
        └── Evidencias de sistema/
            ├── Aplicación/
            │   ├── APK sistema/      # app-debug.apk (Git LFS)
            │   └── Código sistema/rumbo-simce/   # ← código fuente
            ├── Base de datos/        # Modelo lógico y relacional, diccionario de datos, scripts SQL
            └── Rumbo_SIMCE_v16.4_proyecto.zip
```

Código fuente (`FASE 2/Evidencias Proyecto/Evidencias de sistema/Aplicación/Código sistema/rumbo-simce/`):

```
rumbo-simce/
├── backend/        # API REST: src/ (rutas, lógica Kumon, evaluaciones, reconocimiento), migrations/, seeds/, tests/
├── mobile/         # App Expo / React Native: src/screens, src/components, assets
├── docs/           # Registro de cambios por versión, casos de uso, matriz curricular
├── herramientas/   # entrenar-modelo/: reentrenar el lector de dígitos (PyTorch → ONNX)
└── docker-compose.yml   # PostgreSQL local para desarrollo
```

> El APK está guardado con **Git LFS**. Para descargarlo con el repositorio, instala Git LFS antes de clonar o ejecuta `git lfs pull` después.

---

## Instalación rápida (desarrollo)

La guía completa paso a paso para Windows, con Node.js, Docker, JDK 21, Android Studio y LiveKit, está en el **[Instructivo de instalación](FASE%202/Evidencias%20Proyecto/ANEXOS/Instructivo%20plan%20de%20instalaci%C3%B3n.docx)**.

**Requisitos:** Node.js 22, Git, Docker Desktop, JDK 21 y Android SDK (para compilar la APK).

> En Windows, copia el proyecto a una ruta corta (por ejemplo `C:\Rumbo\rumbo-simce`) para evitar errores de compilación por rutas largas.

### 1. Base de datos

```bash
cd rumbo-simce
docker compose up -d        # PostgreSQL 16 en el puerto local 5433
```

### 2. Backend

```bash
cd backend
npm install
# crea backend/.env (ver variables abajo)
npm run db:seed             # aplica migraciones y semillas
npm run db:demo             # crea las cuentas de demostración
npm run dev                 # API en http://localhost:3000
```

Variables principales de `backend/.env`:

```env
DATABASE_URL=postgres://rumbo:rumbo@localhost:5433/rumbo_simce
JWT_SECRET=cambia-esto
PORT=3000

# Videollamadas (LiveKit Cloud)
LIVEKIT_URL=wss://<tu-proyecto>.livekit.cloud
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Opcional: correo saliente (sin esto, los correos salen por consola)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Opcional: reglas del motor Kumon
KUMON_UMBRAL_ACIERTO=1
KUMON_UMBRAL_RETROCESO=0.5
KUMON_MAX_INTENTOS_SIN_ESTANDAR=3
KUMON_SEGUNDOS_EXTRA_ESCRITURA=10
```

> ⚠️ `npm run db:reset` **borra** el esquema y todos los datos. Úsalo solo en una base de demostración.

### 3. App móvil

```bash
cd mobile
npm install
# EXPO_PUBLIC_API_URL=http://<IP-de-tu-PC>:3000   (en mobile/.env)
npm run prebuild:android    # genera el proyecto Android (JDK 21)
npm run android             # compila e instala en el dispositivo
npx expo start --dev-client --host lan -c   # Metro para el día a día
```

Si solo quieres probar la app, instala directamente el **APK** de `FASE 2/Evidencias Proyecto/Evidencias de sistema/Aplicación/APK sistema/`.

### Cuentas de demostración (`npm run db:demo`)

| Perfil | Acceso |
|---|---|
| Estudiante | código `RUMB24` · PIN `1234` |
| Apoderado | `apoderado@demo.cl` · `demo1234` |
| Docente | `docente@demo.cl` · `demo1234` |
| Administrador | `admin@demo.cl` · `demo1234` |
| Curso | `4° Básico Demo` · código `CURS4A` |

---

## Pruebas

```bash
cd backend
npm test                       # pruebas integradas (requiere PostgreSQL)
npm run test:reconocimiento    # lector de números escritos (sin base de datos)
npm run verificar:v16          # verificador de contenido y estructura
npm run demo:reconocimiento    # pizarra web para probar el lector en la tablet: http://IP-DEL-PC:3100

cd ../mobile
npm run typecheck
```

El plan de pruebas completo, con casos trazados a los requerimientos, está en `FASE 2/Evidencias Proyecto/ANEXOS/Plan de Pruebas.xlsx`.

---

## Privacidad y datos de menores

El sistema trata datos de niños y niñas, por lo que se diseñó conforme a la **Ley N° 21.719** de protección de datos personales:

- **Minimización:** el estudiante no tiene correo ni RUT; entra con un código y un PIN que crea su apoderado. En el teléfono se guardan cifrados el código, el apodo y el avatar, **nunca el PIN**.
- **Consentimiento:** sin el consentimiento vigente del apoderado no se puede crear un perfil de estudiante ni practicar. El texto del consentimiento está versionado.
- **Escritura procesada en el servidor del proyecto:** el reconocimiento de números no envía la escritura de los menores a servicios de terceros.
- **Videollamadas con resguardos:** las inicia el apoderado, quedan registradas y no hay chat privado entre profesor y estudiante.
- **Seguridad:** contraseñas con bcrypt, JWT, control de acceso por rol y por vínculo, y bloqueo temporal tras 5 intentos fallidos.

> No subas archivos `.env`, claves de LiveKit ni tokens al repositorio. Usa solo cuentas ficticias en las demostraciones.

---

## Metodología

Scrum adaptado a un semestre, con sprints de dos semanas, reuniones de sincronización, revisiones con el cliente y retrospectivas. El alcance se ajustó tras la retroalimentación de Triskel Edu. El enfoque inicial de mapa de islas con IA adaptativa cambió a un **motor Kumon sobre el temario SIMCE**, con profesor por videollamada y respuestas escritas a mano. El detalle de cada versión está en `rumbo-simce/docs/cambios-v*.md`.

---

## Documentación

| Documento | Ubicación |
|---|---|
| Informe Fase 1 (definición del proyecto) | `FASE 1/Documentos Administrativos/Fase 1/Evidencias Grupales/` |
| Informe final APT | `FASE 2/Evidencias Grupales/` |
| Manual de usuario | `FASE 2/Evidencias Proyecto/ANEXOS/Manual de Usuario.docx` |
| Instructivo de instalación | `FASE 2/Evidencias Proyecto/ANEXOS/Instructivo plan de instalación.docx` |
| Casos de uso, RF y RNF | `FASE 2/Evidencias Proyecto/Evidencias de documentacion/` |
| Modelo de datos y diccionario | `FASE 2/Evidencias Proyecto/Evidencias de sistema/Base de datos/` |
| Presentación final | `FASE 2/Evidencias Proyecto/Presentacion Proyecto.pptx` |

---

## Nota sobre el contenido

Los ejercicios son **originales** y se basan en los objetivos de aprendizaje de Matemática de 4° básico. No reproducen preguntas oficiales del SIMCE ni cuadernillos Kumon.

## Licencia

Proyecto académico de la asignatura Capstone (PTY4614), Duoc UC, desarrollado para Triskel Edu. Uso educativo. Los derechos de uso posteriores se definen con el cliente.
