# Rumbo SIMCE 🏔️🦅

**Plataforma móvil de preparación adaptativa para el SIMCE de Matemática de 4° básico**

Proyecto APT — Asignatura Capstone (PTY4614) — Ingeniería en Informática, Duoc UC (Sede Padre Alonso de Ovalle)
Cliente: **Triskel Edu**

---

## 📖 Descripción del proyecto

Rumbo SIMCE es una aplicación móvil que transforma la preparación para la prueba SIMCE de Matemática de 4° básico en un viaje gamificado por un mapa de islas andinas, guiado por el cóndor **Toko**. Cada isla representa uno de los cinco ejes curriculares de Matemática y se recorre mediante misiones cortas de 5 a 8 minutos, pensadas para sostener la atención de niños y niñas de 9 a 10 años.

El diferenciador central de la solución es su **motor de inteligencia artificial**, que cumple dos funciones:

- **Dificultad adaptativa**: ajusta el nivel de las siguientes preguntas según el desempeño reciente del estudiante.
- **Detección de patrones de error**: cuando un estudiante falla reiteradamente por la misma causa conceptual, el sistema genera una reexplicación con una estrategia didáctica distinta (por ejemplo, de un enfoque numérico a uno visual).

Sobre esta base se construyen **dos paneles analíticos diferenciados**:

- 👪 **Panel del apoderado**: progreso del estudiante por eje y alertas de dificultades recurrentes, en lenguaje no técnico.
- 🧑‍🏫 **Panel del docente**: progreso agregado a nivel de curso, para focalizar la enseñanza en los ejes con mayor dificultad grupal.

### Problema que aborda

La preparación disponible hoy para el SIMCE se apoya principalmente en guías impresas y ensayos genéricos que no se ajustan al ritmo de cada estudiante, entregan retroalimentación tardía y no dan visibilidad del progreso a apoderados ni docentes. A esto se suma que cerca del 48% de los estudiantes de 4° básico declara que el nerviosismo le dificulta concentrarse al rendir una prueba, un factor de ansiedad académica que la solución busca mitigar mediante gamificación.

---

## 🎯 Objetivo general

Desarrollar una aplicación móvil de preparación adaptativa para el SIMCE de Matemática de 4° básico que, mediante gamificación e inteligencia artificial, personalice la práctica del estudiante, entregue retroalimentación inmediata y provea información de progreso accionable a apoderados y docentes.

---

## ✅ Alcance del MVP

**Incluido:**
- Aplicación móvil del estudiante con mapa de progresión por los 5 ejes.
- Motor de misiones y banco de preguntas por eje.
- Motor de dificultad adaptativa y detección de patrones de error.
- Retroalimentación inmediata y reexplicación alternativa.
- Panel web de reportes para apoderado y docente.
- Gestión de perfiles: estudiante, apoderado y docente.
- Gamificación: recompensas, hitos y avance visible.

**Fuera de alcance (segunda etapa):**
- Otro nivel/asignatura (ej. Lectura o 6° básico).
- Generación automática de ítems sin revisión pedagógica.
- Modelos de IA entrenados a medida.
- Tutor conversacional de voz en tiempo real.
- Módulo administrativo completo del establecimiento.
- Integración con plataformas de gestión escolar de terceros.
- Componentes sociales (rankings, competencias entre cursos).

---

## 🏗️ Arquitectura y stack tecnológico

Arquitectura cliente-servidor en tres capas, con el motor adaptativo como servicio independiente para poder evolucionar su lógica (o cambiar de proveedor de IA) sin afectar al resto del sistema.

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend móvil | **React Native** | Una sola base de código para Android e iOS |
| Backend / API | **Node.js + Express** (REST) | Ecosistema conocido por el equipo, buen rendimiento en I/O |
| Base de datos | **PostgreSQL** | Modelo relacional para trazabilidad de sesiones, respuestas y errores |
| Servicio de IA | API de modelo de lenguaje (reexplicaciones) + reglas propias de calibración de dificultad | Separa la generación de explicaciones del control determinista de la progresión |
| Panel web de reportes | **React** | Reutiliza componentes y conocimiento del equipo |
| Hosting / nube | Proveedor cloud con capa gratuita o crédito académico (a confirmar) | Mantiene el costo del proyecto en cero durante el semestre |
| Control de versiones y CI | **Git + GitHub**, flujo de ramas por funcionalidad | Revisión por pares y automatización de pruebas |

> Stack sujeto a validación final con el cliente Triskel Edu.

---

## 🗂️ Módulos y perfiles de usuario

**Módulos:** mapa de aventura y progresión por islas · motor de misiones y preguntas · motor de IA adaptativa · sistema de recompensas y gamificación · panel de reportes para apoderados · panel de reportes para docentes.

| Perfil | Funcionalidades principales | ¿En el MVP? |
|---|---|---|
| Estudiante | Jugar misiones, avanzar en el mapa, recibir retroalimentación y recompensas | Sí |
| Apoderado | Vincular estudiante, otorgar consentimiento, ver progreso, recibir alertas | Sí |
| Docente | Ver progreso agregado del curso, identificar ejes con mayor dificultad | Sí |
| Administrador | Gestionar usuarios, cursos y contenidos | Por validar |

---

## 🧩 Modelo de datos (preliminar)

Entidades principales: `Usuario`, `Estudiante`, `Apoderado`, `Curso`, `Eje`, `Pregunta`, `Sesión`, `Respuesta`, `PatrónError`, `Recompensa`.

El modelo se estructura en torno a la trazabilidad del aprendizaje: cada respuesta queda asociada a un estudiante, una pregunta, un eje y una sesión, permitiendo reconstruir patrones de error de forma eficiente.

---

## 🔐 Privacidad y cumplimiento normativo

Al tratar datos de menores de edad, el sistema se diseña conforme a la **Ley N° 21.719** de protección de datos personales (vigente desde el 1 de diciembre de 2026), aplicando:

- Minimización de datos.
- Consentimiento explícito del apoderado (RF12).
- Cifrado en tránsito y control de acceso por rol.
- Trazabilidad de la información tratada.

---

## 🧪 Metodología de trabajo

Marco ágil tipo **Scrum**, con sprints de dos semanas:

- Planificación de sprint (cada 2 semanas)
- Reunión de sincronización (2 veces por semana)
- Revisión de sprint y retrospectiva (cierre de cada sprint)
- Backlog de producto y tablero de tareas (permanentes)

### Plan de pruebas

Cuatro niveles aplicados de forma incremental durante los sprints: **pruebas unitarias**, **de integración**, **de aceptación** (trazadas a los requerimientos funcionales) y **con usuarios** (estudiantes de la edad objetivo, apoderados y docentes).

---

## 👥 Equipo

| Integrante | Rol / foco |
|---|---|
| **Cristóbal Muñoz** | Datos, inteligencia artificial y motor adaptativo |
| **Nixy Silva** | Por definir |
| **Leonardo Figueroa** | Por definir |

**Docente:** Arturo Vargas

---

## 📅 Planificación por sprints

| Sprint | Periodo | Entregable |
|---|---|---|
| Sprint 0 | Semanas 1-2 | Definición del proyecto y validación de requerimientos |
| Sprint 1 | Semanas 3-4 | Modelo de datos, API base y autenticación por rol |
| Sprint 2 | Semanas 5-6 | Motor de misiones y banco inicial de preguntas |
| Sprint 3 | Semanas 7-8 | Mapa de progresión y app móvil navegable |
| Sprint 4 | Semanas 9-10 | Motor de dificultad adaptativa y feedback inmediato |
| Sprint 5 | Semanas 11-12 | Detección de patrones de error y reexplicación |
| Sprint 6 | Semanas 13-14 | Paneles de reportes y gamificación |
| Sprint 7 | Semanas 15-16 | Pruebas con usuarios, despliegue y presentación final |

---

## 📁 Estructura del repositorio (sugerida)

```
rumbo-simce/
├── mobile-app/          # Aplicación React Native (estudiante)
├── web-dashboard/       # Panel web de reportes (React) - apoderado/docente
├── backend/             # API REST (Node.js + Express)
├── ai-service/          # Servicio de dificultad adaptativa y reexplicaciones
├── docs/                # Documentación del proyecto (informes de fase, actas, etc.)
└── README.md
```

---

## 📚 Documentación relacionada

Este repositorio acompaña el informe técnico de la Fase 1 (Evaluación Formativa) de la asignatura Capstone, que incluye la definición completa del proyecto, requerimientos funcionales y no funcionales, análisis de factibilidad y trazabilidad con el perfil de egreso.

---

## 📄 Licencia

Proyecto académico desarrollado en el marco de la asignatura Capstone (PTY4614), Duoc UC. Uso educativo — licencia por definir junto al cliente Triskel Edu.
