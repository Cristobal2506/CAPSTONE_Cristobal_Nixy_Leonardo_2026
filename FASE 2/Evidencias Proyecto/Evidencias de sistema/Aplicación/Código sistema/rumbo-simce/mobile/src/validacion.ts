// Validaciones en la app: las mismas reglas que la API, para avisar antes de enviar.
import { ApiError } from './api';

export const validarEmail = (v: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? null : 'Escribe un correo válido, por ejemplo nombre@correo.cl';

export const validarPassword = (v: string) => (v.length >= 8 ? null : 'Debe tener al menos 8 caracteres');

export const validarNombre = (v: string) => (v.trim().length >= 2 ? null : 'Escribe tu nombre');

/** Mensaje para el usuario a partir de un error de la API o de red. */
export const mensajeDeError = (e: unknown) =>
  e instanceof ApiError ? e.message : 'No pudimos conectarnos. Revisa tu conexión a internet.';
