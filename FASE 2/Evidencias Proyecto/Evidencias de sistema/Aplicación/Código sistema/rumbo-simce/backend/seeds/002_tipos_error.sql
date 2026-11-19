-- Catálogo inicial de errores típicos por eje (CU08 / HU-16).
-- Borrador del equipo: validar y completar con el equipo pedagógico de Triskel Edu.
INSERT INTO tipo_error (codigo, eje_id, descripcion) VALUES
  ('calculo',               NULL, 'Error de cálculo: el procedimiento es correcto pero la cuenta no'),
  ('operacion_equivocada',  NULL, 'Usa una operación distinta a la que pide el problema'),
  ('valor_posicional',      (SELECT id FROM eje WHERE codigo = 'numeros'),   'Confunde el valor de un dígito según su posición'),
  ('reserva_suma',          (SELECT id FROM eje WHERE codigo = 'numeros'),   'Olvida la reserva al sumar'),
  ('resta_invertida',       (SELECT id FROM eje WHERE codigo = 'numeros'),   'En cada columna resta el dígito menor al mayor, sin canjear'),
  ('tabla_multiplicar',     (SELECT id FROM eje WHERE codigo = 'numeros'),   'Error en las tablas de multiplicar'),
  ('fraccion_partes',       (SELECT id FROM eje WHERE codigo = 'numeros'),   'Confunde las partes de una fracción (numerador / denominador)'),
  ('patron_regla',          (SELECT id FROM eje WHERE codigo = 'patrones'),  'Identifica mal la regla del patrón'),
  ('ecuacion_inversa',      (SELECT id FROM eje WHERE codigo = 'patrones'),  'No usa la operación inversa para encontrar el valor desconocido'),
  ('figura_propiedades',    (SELECT id FROM eje WHERE codigo = 'geometria'), 'Confunde las propiedades de las figuras 2D'),
  ('cuerpo_elementos',      (SELECT id FROM eje WHERE codigo = 'geometria'), 'Cuenta mal caras, aristas o vértices de un cuerpo 3D'),
  ('angulo_tipo',           (SELECT id FROM eje WHERE codigo = 'geometria'), 'Confunde los tipos de ángulo'),
  ('simetria',              (SELECT id FROM eje WHERE codigo = 'geometria'), 'No reconoce ejes de simetría'),
  ('orientacion',           (SELECT id FROM eje WHERE codigo = 'geometria'), 'Se equivoca en giros o puntos cardinales'),
  ('unidad_conversion',     (SELECT id FROM eje WHERE codigo = 'medicion'),  'Convierte mal entre unidades de medida'),
  ('perimetro_area',        (SELECT id FROM eje WHERE codigo = 'medicion'),  'Confunde perímetro con área o suma solo algunos lados'),
  ('lectura_hora',          (SELECT id FROM eje WHERE codigo = 'medicion'),  'Lee o calcula mal la hora'),
  ('calendario',            (SELECT id FROM eje WHERE codigo = 'medicion'),  'Se equivoca al contar días en el calendario'),
  ('lectura_grafico',       (SELECT id FROM eje WHERE codigo = 'datos'),     'Lee mal una tabla o gráfico (escala, categoría)'),
  ('conteo_tabla',          (SELECT id FROM eje WHERE codigo = 'datos'),     'Cuenta mal en una tabla de conteo'),
  ('probabilidad_terminos', (SELECT id FROM eje WHERE codigo = 'datos'),     'Confunde seguro, posible e imposible / más o menos probable')
ON CONFLICT (codigo) DO UPDATE SET eje_id = EXCLUDED.eje_id, descripcion = EXCLUDED.descripcion;
