// CU01 — La sesión sobrevive al cierre de la app.
// En el teléfono se guarda cifrada con expo-secure-store (Keychain en iOS, Keystore en Android).
// En el navegador (expo start --web, solo para desarrollo) se usa localStorage.
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Rol } from './api';

const CLAVE = 'rumbo.sesion';

export interface SesionGuardada {
  token: string;
  rol: Rol;
  /** Nombre del adulto o apodo del estudiante: permite mostrar algo aunque no haya internet. */
  nombre: string;
  /** Avatar del estudiante (para mostrarlo en el mapa aunque no haya internet). */
  avatar?: string;
}

const web = Platform.OS === 'web';

export async function guardarSesion(s: SesionGuardada): Promise<void> {
  const valor = JSON.stringify(s);
  if (web) globalThis.localStorage?.setItem(CLAVE, valor);
  else await SecureStore.setItemAsync(CLAVE, valor);
}

export async function leerSesion(): Promise<SesionGuardada | null> {
  try {
    const valor = web ? globalThis.localStorage?.getItem(CLAVE) ?? null : await SecureStore.getItemAsync(CLAVE);
    return valor ? (JSON.parse(valor) as SesionGuardada) : null;
  } catch {
    return null; // dato corrupto o almacenamiento no disponible: se pide iniciar sesión de nuevo
  }
}

export async function borrarSesion(): Promise<void> {
  try {
    if (web) globalThis.localStorage?.removeItem(CLAVE);
    else await SecureStore.deleteItemAsync(CLAVE);
  } catch {
    // si no se puede borrar, igual se olvida el token en memoria
  }
}
