// v16: dibuja trazos con Views (sin react-native-svg ni otros módulos nativos:
// no hace falta recompilar la APK). Cada tramo es un rectángulo rotado y cada punto un círculo.
import { memo } from 'react';
import { View } from 'react-native';

export type Punto = [number, number];
export type Trazo = Punto[];

export const TramosTrazo = memo(function TramosTrazo({ trazo, grosor, color, escala = 1, dx = 0, dy = 0 }:
  { trazo: Trazo; grosor: number; color: string; escala?: number; dx?: number; dy?: number }) {
  const piezas = [];
  const p = trazo.map(([x, y]) => [x * escala + dx, y * escala + dy] as Punto);
  for (let i = 0; i < p.length; i++) {
    const [x, y] = p[i];
    piezas.push(<View key={`p${i}`} style={{ position: 'absolute', left: x - grosor / 2, top: y - grosor / 2,
      width: grosor, height: grosor, borderRadius: grosor / 2, backgroundColor: color }} />);
    if (i > 0) {
      const [ax, ay] = p[i - 1];
      const largo = Math.hypot(x - ax, y - ay);
      if (largo < 0.5) continue;
      const ang = Math.atan2(y - ay, x - ax);
      piezas.push(<View key={`s${i}`} style={{ position: 'absolute', left: (ax + x) / 2 - largo / 2, top: (ay + y) / 2 - grosor / 2,
        width: largo, height: grosor, backgroundColor: color, transform: [{ rotate: `${ang}rad` }] }} />);
    }
  }
  return <>{piezas}</>;
});

// Miniatura de una respuesta escrita (para el docente).
export function MiniaturaTrazos({ trazos, ancho = 220, alto = 70, color = '#1B3A5C' }:
  { trazos: Trazo[]; ancho?: number; alto?: number; color?: string }) {
  const pts = trazos.flat();
  if (!pts.length) return null;
  const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0]));
  const y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
  const esc = Math.min((ancho - 12) / Math.max(x1 - x0, 1), (alto - 12) / Math.max(y1 - y0, 1), 1);
  const dx = (ancho - (x1 - x0) * esc) / 2 - x0 * esc, dy = (alto - (y1 - y0) * esc) / 2 - y0 * esc;
  return (
    <View style={{ width: ancho, height: alto, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#D5DEE7', overflow: 'hidden' }}
      accessibilityLabel="Escritura del estudiante">
      {trazos.map((t, i) => <TramosTrazo key={i} trazo={t} grosor={3} color={color} escala={esc} dx={dx} dy={dy} />)}
    </View>
  );
}
