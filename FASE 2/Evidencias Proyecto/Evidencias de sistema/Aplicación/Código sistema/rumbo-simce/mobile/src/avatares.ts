// Avatares disponibles para el estudiante (HU-07). La API guarda la clave; la app muestra el emoji.
// Provisorio: se reemplazan por las ilustraciones del equipo de diseño.
export const AVATARES = [
  { clave: 'condor', emoji: '🦅', nombre: 'Cóndor' },
  { clave: 'llama', emoji: '🦙', nombre: 'Llama' },
  { clave: 'zorro', emoji: '🦊', nombre: 'Zorro' },
  { clave: 'pinguino', emoji: '🐧', nombre: 'Pingüino' },
  { clave: 'ballena', emoji: '🐋', nombre: 'Ballena' },
  { clave: 'tortuga', emoji: '🐢', nombre: 'Tortuga' },
] as const;

export const emojiAvatar = (clave: string) => AVATARES.find((a) => a.clave === clave)?.emoji ?? '🦅';
