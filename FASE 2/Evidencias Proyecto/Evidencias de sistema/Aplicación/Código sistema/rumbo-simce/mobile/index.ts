import { registerRootComponent } from 'expo';
import { registerGlobals } from '@livekit/react-native';

// Inicializar las primitivas WebRTC antes de importar componentes de la app.
registerGlobals();

// require tras registerGlobals para evitar cargar dependencias de LiveKit prematuramente.
const App = require('./App').default;
registerRootComponent(App);
