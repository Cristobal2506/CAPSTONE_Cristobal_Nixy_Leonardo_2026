# Entrenar el modelo de dígitos (opcional)

El modelo ya viene entrenado en `backend/modelos/digitos.onnx` (1,8 MB). Esta carpeta sirve para
reentrenarlo, por ejemplo con muestras reales de alumnos escritas en las tablets.

**Datos:** 10 000 dígitos MNIST incluidos en el paquete npm `mnist` (8 500 para entrenar y 1 500 reservados para medir).
**Red:** CNN de 4 capas convolucionales + 2 densas (≈ 470 000 parámetros), con aumentos que imitan
trazos de dedo o lápiz: rotación, inclinación, ancho variable y grosor de trazo variable.
**Resultado (registro-entrenamiento.txt):** 98,1 % en los 1 500 dígitos MNIST reservados.

```bash
cd herramientas/entrenar-modelo
npm i mnist                     # descarga los 10 000 dígitos
pip install torch onnx          # Python 3.10+
python entrenar.py 20           # 20 épocas, ~6 min en CPU; escribe ../../backend/modelos/digitos.onnx
cd ../../backend && npm run test:reconocimiento
```

Para mejorar la precisión con niños reales: guardar las escrituras confirmadas por los alumnos
(`evaluacion_respuesta.trazos` + `respuesta_texto`), rasterizarlas con `src/lib/reconocimiento/trazos.js`
y agregarlas al entrenamiento.
