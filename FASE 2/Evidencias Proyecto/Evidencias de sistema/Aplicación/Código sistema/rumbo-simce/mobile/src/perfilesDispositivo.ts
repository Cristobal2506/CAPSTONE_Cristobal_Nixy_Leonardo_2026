// HU-03 — Acceso simple y visual del estudiante.
// El teléfono recuerda a los estudiantes que ya entraron en él (o que su apoderado dejó listos):
// la próxima vez el niño solo toca su avatar y escribe su PIN (máximo dos pasos).
// Se guarda cifrado igual que la sesión (expo-secure-store). Se guarda el código de acceso, nunca el PIN.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CLAVE = 'rumbo.perfiles';
const MAXIMO = 6; // un teléfono compartido por una familia o un curso pequeño

export interface PerfilDispositivo {
  codigo: string;
  apodo: string;
  avatar: string;
}

const web = Platform.OS === 'web';

async function leerCrudo(): Promise<string | null> {
  return web ? globalThis.localStorage?.getItem(CLAVE) ?? null : SecureStore.getItemAsync(CLAVE);
}

async function escribir(perfiles: PerfilDispositivo[]): Promise<void> {
  const valor = JSON.stringify(perfiles);
  if (web) globalThis.localStorage?.setItem(CLAVE, valor);
  else await SecureStore.setItemAsync(CLAVE, valor);
}

export async function leerPerfiles(): Promise<PerfilDispositivo[]> {
  try {
    const valor = await leerCrudo();
    const lista = valor ? (JSON.parse(valor) as PerfilDispositivo[]) : [];
    return Array.isArray(lista) ? lista.filter((p) => p && typeof p.codigo === 'string') : [];
  } catch {
    return []; // dato corrupto o almacenamiento no disponible: se entra con el código
  }
}

/** Agrega o actualiza un perfil (queda primero en la lista). */
export async function recordarPerfil(perfil: PerfilDispositivo): Promise<void> {
  try {
    const otros = (await leerPerfiles()).filter((p) => p.codigo !== perfil.codigo);
    await escribir([perfil, ...otros].slice(0, MAXIMO));
  } catch {
    // si no se puede guardar, el niño sigue pudiendo entrar con su código
  }
}

export async function olvidarPerfil(codigo: string): Promise<void> {
  try {
    await escribir((await leerPerfiles()).filter((p) => p.codigo !== codigo));
  } catch {
    // nada que hacer
  }
}
