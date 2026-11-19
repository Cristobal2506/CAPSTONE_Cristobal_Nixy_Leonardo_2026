// Ajustes posteriores a `expo prebuild --clean` para Windows (Java 21).
// Guardar fuera de android/ para reproducirlo tras regenerar proyecto nativo.
const fs = require('node:fs');
const path = require('node:path');
const archivo = path.join(__dirname, '..', 'android', 'gradle', 'gradle-daemon-jvm.properties');
if (!fs.existsSync(path.dirname(archivo))) {
  console.error('No existe mobile/android/gradle; primero ejecutar npx expo prebuild --platform android --clean');
  process.exit(1);
}
const anterior = fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : '';
let nuevo = /^toolchainVersion\s*=.*$/m.test(anterior)
  ? anterior.replace(/^toolchainVersion\s*=.*$/m, 'toolchainVersion=21')
  : `${anterior.trimEnd()}\n${anterior ? '' : '# Gradle Daemon JVM - Rumbo SIMCE v13.1\n'}toolchainVersion=21\n`;
fs.writeFileSync(archivo, nuevo, 'utf8');
console.log('Gradle daemon JVM configurado para JDK 21 en:', archivo);
console.log('Selecciona también JDK 21 en Android Studio y usa JAVA_HOME JDK 21 en PowerShell.');
