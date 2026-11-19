-- GENERADO por scripts/generar-secuencia.js — no editar a mano (ver ese archivo).
-- Secuencia Kumon PROVISORIA de Números y operaciones (CU18): contenido de prueba hasta recibir los facsímiles.
-- Idempotente: no duplica nada si se ejecuta varias veces.

INSERT INTO nivel (codigo, nombre, eje_id, orden) VALUES ('NUM-N1', 'Nivel 1 · Valor posicional y adición', (SELECT id FROM eje WHERE codigo = 'numeros'), 1)
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO conjunto (codigo, nivel_id, orden, titulo, objetivo_aprendizaje, tiempo_estandar_seg) VALUES
  ('NUM-N1-C1', (SELECT id FROM nivel WHERE codigo = 'NUM-N1'), 1, 'Valor posicional hasta 10.000', 'Números hasta 10.000: valor posicional (etiqueta provisoria, validar con el temario)', 180)
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja (conjunto_id, orden, ejemplo_enunciado, ejemplo_resolucion) VALUES
  ((SELECT id FROM conjunto WHERE codigo = 'NUM-N1-C1'), 1, '¿Cuál es el valor del dígito 5 en el número 6.185?', '6.185 tiene 6 unidades de mil, 1 centena, 8 decenas, 5 unidades.
El 5 está en las unidades.
Vale 5 × 1 = 5.')
  ON CONFLICT (conjunto_id, orden) DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C1-H1-1', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuál es el valor del dígito 5 en el número 5.741?', '[{"clave":"A","texto":"5","tipo_error":"valor_posicional"},{"clave":"B","texto":"500","tipo_error":"valor_posicional"},{"clave":"C","texto":"5.000","tipo_error":null},{"clave":"D","texto":"50","tipo_error":"valor_posicional"}]'::jsonb, 'C', 1, 'numerica', 'El 5 está en las unidades de mil: vale 5 × 1.000 = 5.000.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C1' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N1C1-H1-1'), 1)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C1-H1-2', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuál es el valor del dígito 3 en el número 3.914?', '[{"clave":"A","texto":"3","tipo_error":"valor_posicional"},{"clave":"B","texto":"30","tipo_error":"valor_posicional"},{"clave":"C","texto":"3.000","tipo_error":null},{"clave":"D","texto":"300","tipo_error":"valor_posicional"}]'::jsonb, 'C', 1, 'numerica', 'El 3 está en las unidades de mil: vale 3 × 1.000 = 3.000.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C1' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N1C1-H1-2'), 2)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C1-H1-3', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuál es el valor del dígito 1 en el número 2.561?', '[{"clave":"A","texto":"1","tipo_error":null},{"clave":"B","texto":"1.000","tipo_error":"valor_posicional"},{"clave":"C","texto":"10","tipo_error":"valor_posicional"},{"clave":"D","texto":"100","tipo_error":"valor_posicional"}]'::jsonb, 'A', 1, 'numerica', 'El 1 está en las unidades: vale 1 × 1 = 1.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C1' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N1C1-H1-3'), 3)
  ON CONFLICT DO NOTHING;
INSERT INTO hoja (conjunto_id, orden, ejemplo_enunciado, ejemplo_resolucion) VALUES
  ((SELECT id FROM conjunto WHERE codigo = 'NUM-N1-C1'), 2, '¿Cuál es el valor del dígito 3 en el número 5.763?', '5.763 tiene 5 unidades de mil, 7 centenas, 6 decenas, 3 unidades.
El 3 está en las unidades.
Vale 3 × 1 = 3.')
  ON CONFLICT (conjunto_id, orden) DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C1-H2-1', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuál es el valor del dígito 6 en el número 6.243?', '[{"clave":"A","texto":"600","tipo_error":"valor_posicional"},{"clave":"B","texto":"6","tipo_error":"valor_posicional"},{"clave":"C","texto":"6.000","tipo_error":null},{"clave":"D","texto":"60","tipo_error":"valor_posicional"}]'::jsonb, 'C', 1, 'numerica', 'El 6 está en las unidades de mil: vale 6 × 1.000 = 6.000.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C1' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N1C1-H2-1'), 1)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C1-H2-2', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuál es el valor del dígito 8 en el número 3.789?', '[{"clave":"A","texto":"80","tipo_error":null},{"clave":"B","texto":"8","tipo_error":"valor_posicional"},{"clave":"C","texto":"800","tipo_error":"valor_posicional"},{"clave":"D","texto":"8.000","tipo_error":"valor_posicional"}]'::jsonb, 'A', 1, 'numerica', 'El 8 está en las decenas: vale 8 × 10 = 80.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C1' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N1C1-H2-2'), 2)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C1-H2-3', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuál es el valor del dígito 5 en el número 6.415?', '[{"clave":"A","texto":"50","tipo_error":"valor_posicional"},{"clave":"B","texto":"5.000","tipo_error":"valor_posicional"},{"clave":"C","texto":"500","tipo_error":"valor_posicional"},{"clave":"D","texto":"5","tipo_error":null}]'::jsonb, 'D', 1, 'numerica', 'El 5 está en las unidades: vale 5 × 1 = 5.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C1' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N1C1-H2-3'), 3)
  ON CONFLICT DO NOTHING;
INSERT INTO conjunto (codigo, nivel_id, orden, titulo, objetivo_aprendizaje, tiempo_estandar_seg) VALUES
  ('NUM-N1-C2', (SELECT id FROM nivel WHERE codigo = 'NUM-N1'), 2, 'Adición con reserva', 'Adición y sustracción hasta 1.000 (etiqueta provisoria, validar con el temario)', 240)
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja (conjunto_id, orden, ejemplo_enunciado, ejemplo_resolucion) VALUES
  ((SELECT id FROM conjunto WHERE codigo = 'NUM-N1-C2'), 1, '218 + 146', 'Unidades: 8 + 6 = 14 → escribo 4 y llevo 1.
Decenas: 1 + 4 + 1 = 6.
Centenas: 2 + 1 = 3.
Resultado: 364.')
  ON CONFLICT (conjunto_id, orden) DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C2-H1-1', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 659 + 136?', '[{"clave":"A","texto":"523","tipo_error":"operacion_equivocada"},{"clave":"B","texto":"795","tipo_error":null},{"clave":"C","texto":"785","tipo_error":"reserva_suma"},{"clave":"D","texto":"805","tipo_error":"calculo"}]'::jsonb, 'B', 1, 'numerica', 'Unidades: 9 + 6 = 15, se anota 5 y se lleva 1. Resultado: 795.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C2' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N1C2-H1-1'), 1)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C2-H1-2', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 325 + 126?', '[{"clave":"A","texto":"451","tipo_error":null},{"clave":"B","texto":"199","tipo_error":"operacion_equivocada"},{"clave":"C","texto":"441","tipo_error":"reserva_suma"},{"clave":"D","texto":"461","tipo_error":"calculo"}]'::jsonb, 'A', 1, 'numerica', 'Unidades: 5 + 6 = 11, se anota 1 y se lleva 1. Resultado: 451.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C2' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N1C2-H1-2'), 2)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C2-H1-3', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 224 + 217?', '[{"clave":"A","texto":"7","tipo_error":"operacion_equivocada"},{"clave":"B","texto":"431","tipo_error":"reserva_suma"},{"clave":"C","texto":"441","tipo_error":null},{"clave":"D","texto":"451","tipo_error":"calculo"}]'::jsonb, 'C', 1, 'numerica', 'Unidades: 4 + 7 = 11, se anota 1 y se lleva 1. Resultado: 441.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C2' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N1C2-H1-3'), 3)
  ON CONFLICT DO NOTHING;
INSERT INTO hoja (conjunto_id, orden, ejemplo_enunciado, ejemplo_resolucion) VALUES
  ((SELECT id FROM conjunto WHERE codigo = 'NUM-N1-C2'), 2, '273 + 228', 'Unidades: 3 + 8 = 11 → escribo 1 y llevo 1.
Decenas: 7 + 2 + 1 = 10 → escribo 0 y llevo 1.
Centenas: 2 + 2 + 1 = 5.
Resultado: 501.')
  ON CONFLICT (conjunto_id, orden) DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C2-H2-1', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 309 + 259?', '[{"clave":"A","texto":"578","tipo_error":"calculo"},{"clave":"B","texto":"558","tipo_error":"reserva_suma"},{"clave":"C","texto":"50","tipo_error":"operacion_equivocada"},{"clave":"D","texto":"568","tipo_error":null}]'::jsonb, 'D', 1, 'numerica', 'Unidades: 9 + 9 = 18, se anota 8 y se lleva 1. Resultado: 568.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C2' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N1C2-H2-1'), 1)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C2-H2-2', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 315 + 297?', '[{"clave":"A","texto":"622","tipo_error":"calculo"},{"clave":"B","texto":"502","tipo_error":"reserva_suma"},{"clave":"C","texto":"18","tipo_error":"operacion_equivocada"},{"clave":"D","texto":"612","tipo_error":null}]'::jsonb, 'D', 1, 'numerica', 'Unidades: 5 + 7 = 12, se anota 2 y se lleva 1. Resultado: 612.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C2' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N1C2-H2-2'), 2)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N1C2-H2-3', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 534 + 178?', '[{"clave":"A","texto":"712","tipo_error":null},{"clave":"B","texto":"722","tipo_error":"calculo"},{"clave":"C","texto":"602","tipo_error":"reserva_suma"},{"clave":"D","texto":"356","tipo_error":"operacion_equivocada"}]'::jsonb, 'A', 1, 'numerica', 'Unidades: 4 + 8 = 12, se anota 2 y se lleva 1. Resultado: 712.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N1-C2' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N1C2-H2-3'), 3)
  ON CONFLICT DO NOTHING;

INSERT INTO nivel (codigo, nombre, eje_id, orden) VALUES ('NUM-N2', 'Nivel 2 · Sustracción y multiplicación', (SELECT id FROM eje WHERE codigo = 'numeros'), 2)
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO conjunto (codigo, nivel_id, orden, titulo, objetivo_aprendizaje, tiempo_estandar_seg) VALUES
  ('NUM-N2-C1', (SELECT id FROM nivel WHERE codigo = 'NUM-N2'), 1, 'Sustracción con canje', 'Adición y sustracción hasta 1.000 (etiqueta provisoria, validar con el temario)', 300)
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja (conjunto_id, orden, ejemplo_enunciado, ejemplo_resolucion) VALUES
  ((SELECT id FROM conjunto WHERE codigo = 'NUM-N2-C1'), 1, '320 − 105', 'Unidades: a 0 no le puedo restar 5. Canjeo 1 decena: 10 − 5 = 5.
Decenas: me queda 1; 1 − 0 = 1.
Centenas: 3 − 1 = 2.
Resultado: 215.')
  ON CONFLICT (conjunto_id, orden) DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C1-H1-1', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 642 − 414?', '[{"clave":"A","texto":"238","tipo_error":"calculo"},{"clave":"B","texto":"228","tipo_error":null},{"clave":"C","texto":"232","tipo_error":"resta_invertida"},{"clave":"D","texto":"1.056","tipo_error":"operacion_equivocada"}]'::jsonb, 'B', 2, 'numerica', 'A 2 no se le puede restar 4: se canjea 1 decena por 10 unidades. Resultado: 228.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C1' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N2C1-H1-1'), 1)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C1-H1-2', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 450 − 138?', '[{"clave":"A","texto":"328","tipo_error":"resta_invertida"},{"clave":"B","texto":"322","tipo_error":"calculo"},{"clave":"C","texto":"312","tipo_error":null},{"clave":"D","texto":"588","tipo_error":"operacion_equivocada"}]'::jsonb, 'C', 2, 'numerica', 'A 0 no se le puede restar 8: se canjea 1 decena por 10 unidades. Resultado: 312.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C1' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N2C1-H1-2'), 2)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C1-H1-3', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 885 − 219?', '[{"clave":"A","texto":"666","tipo_error":null},{"clave":"B","texto":"674","tipo_error":"resta_invertida"},{"clave":"C","texto":"676","tipo_error":"calculo"},{"clave":"D","texto":"1.104","tipo_error":"operacion_equivocada"}]'::jsonb, 'A', 2, 'numerica', 'A 5 no se le puede restar 9: se canjea 1 decena por 10 unidades. Resultado: 666.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C1' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N2C1-H1-3'), 3)
  ON CONFLICT DO NOTHING;
INSERT INTO hoja (conjunto_id, orden, ejemplo_enunciado, ejemplo_resolucion) VALUES
  ((SELECT id FROM conjunto WHERE codigo = 'NUM-N2-C1'), 2, '478 − 129', 'Unidades: a 8 no le puedo restar 9. Canjeo 1 decena: 18 − 9 = 9.
Decenas: me quedan 6; 6 − 2 = 4.
Centenas: 4 − 1 = 3.
Resultado: 349.')
  ON CONFLICT (conjunto_id, orden) DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C1-H2-1', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 685 − 119?', '[{"clave":"A","texto":"574","tipo_error":"resta_invertida"},{"clave":"B","texto":"566","tipo_error":null},{"clave":"C","texto":"804","tipo_error":"operacion_equivocada"},{"clave":"D","texto":"576","tipo_error":"calculo"}]'::jsonb, 'B', 2, 'numerica', 'A 5 no se le puede restar 9: se canjea 1 decena por 10 unidades. Resultado: 566.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C1' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N2C1-H2-1'), 1)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C1-H2-2', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 970 − 846?', '[{"clave":"A","texto":"136","tipo_error":"resta_invertida"},{"clave":"B","texto":"134","tipo_error":"calculo"},{"clave":"C","texto":"1.816","tipo_error":"operacion_equivocada"},{"clave":"D","texto":"124","tipo_error":null}]'::jsonb, 'D', 2, 'numerica', 'A 0 no se le puede restar 6: se canjea 1 decena por 10 unidades. Resultado: 124.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C1' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N2C1-H2-2'), 2)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C1-H2-3', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 470 − 116?', '[{"clave":"A","texto":"366","tipo_error":"resta_invertida"},{"clave":"B","texto":"586","tipo_error":"operacion_equivocada"},{"clave":"C","texto":"354","tipo_error":null},{"clave":"D","texto":"364","tipo_error":"calculo"}]'::jsonb, 'C', 2, 'numerica', 'A 0 no se le puede restar 6: se canjea 1 decena por 10 unidades. Resultado: 354.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C1' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N2C1-H2-3'), 3)
  ON CONFLICT DO NOTHING;
INSERT INTO conjunto (codigo, nivel_id, orden, titulo, objetivo_aprendizaje, tiempo_estandar_seg) VALUES
  ('NUM-N2-C2', (SELECT id FROM nivel WHERE codigo = 'NUM-N2'), 2, 'Tablas de multiplicar', 'Prerrequisito de 3.º básico: tablas de multiplicar (etiqueta provisoria)', 150)
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja (conjunto_id, orden, ejemplo_enunciado, ejemplo_resolucion) VALUES
  ((SELECT id FROM conjunto WHERE codigo = 'NUM-N2-C2'), 1, '8 × 9', '8 × 9 es 9 veces el 8: 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 + 8 = 72.
Si sabes 8 × 8 = 64, súmale 8 más: 72.')
  ON CONFLICT (conjunto_id, orden) DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C2-H1-1', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 7 × 3?', '[{"clave":"A","texto":"14","tipo_error":"tabla_multiplicar"},{"clave":"B","texto":"10","tipo_error":"operacion_equivocada"},{"clave":"C","texto":"21","tipo_error":null},{"clave":"D","texto":"28","tipo_error":"tabla_multiplicar"}]'::jsonb, 'C', 2, 'numerica', '7 × 3 es sumar 3 veces el 7: 21.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C2' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N2C2-H1-1'), 1)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C2-H1-2', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 9 × 3?', '[{"clave":"A","texto":"12","tipo_error":"operacion_equivocada"},{"clave":"B","texto":"36","tipo_error":"tabla_multiplicar"},{"clave":"C","texto":"18","tipo_error":"tabla_multiplicar"},{"clave":"D","texto":"27","tipo_error":null}]'::jsonb, 'D', 2, 'numerica', '9 × 3 es sumar 3 veces el 9: 27.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C2' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N2C2-H1-2'), 2)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C2-H1-3', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 8 × 5?', '[{"clave":"A","texto":"40","tipo_error":null},{"clave":"B","texto":"48","tipo_error":"tabla_multiplicar"},{"clave":"C","texto":"32","tipo_error":"tabla_multiplicar"},{"clave":"D","texto":"13","tipo_error":"operacion_equivocada"}]'::jsonb, 'A', 2, 'numerica', '8 × 5 es sumar 5 veces el 8: 40.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C2' AND h.orden = 1), (SELECT id FROM pregunta WHERE codigo = 'K-N2C2-H1-3'), 3)
  ON CONFLICT DO NOTHING;
INSERT INTO hoja (conjunto_id, orden, ejemplo_enunciado, ejemplo_resolucion) VALUES
  ((SELECT id FROM conjunto WHERE codigo = 'NUM-N2-C2'), 2, '9 × 5', '9 × 5 es 5 veces el 9: 9 + 9 + 9 + 9 + 9 = 45.
Si sabes 9 × 4 = 36, súmale 9 más: 45.')
  ON CONFLICT (conjunto_id, orden) DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C2-H2-1', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 6 × 5?', '[{"clave":"A","texto":"36","tipo_error":"tabla_multiplicar"},{"clave":"B","texto":"24","tipo_error":"tabla_multiplicar"},{"clave":"C","texto":"11","tipo_error":"operacion_equivocada"},{"clave":"D","texto":"30","tipo_error":null}]'::jsonb, 'D', 2, 'numerica', '6 × 5 es sumar 5 veces el 6: 30.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C2' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N2C2-H2-1'), 1)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C2-H2-2', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 9 × 8?', '[{"clave":"A","texto":"17","tipo_error":"operacion_equivocada"},{"clave":"B","texto":"81","tipo_error":"tabla_multiplicar"},{"clave":"C","texto":"63","tipo_error":"tabla_multiplicar"},{"clave":"D","texto":"72","tipo_error":null}]'::jsonb, 'D', 2, 'numerica', '9 × 8 es sumar 8 veces el 9: 72.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C2' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N2C2-H2-2'), 2)
  ON CONFLICT DO NOTHING;
INSERT INTO pregunta (codigo, eje_id, enunciado, opciones, respuesta_correcta, dificultad, estrategia, explicacion)
  VALUES ('K-N2C2-H2-3', (SELECT id FROM eje WHERE codigo = 'numeros'), '¿Cuánto es 6 × 4?', '[{"clave":"A","texto":"30","tipo_error":"tabla_multiplicar"},{"clave":"B","texto":"10","tipo_error":"operacion_equivocada"},{"clave":"C","texto":"24","tipo_error":null},{"clave":"D","texto":"18","tipo_error":"tabla_multiplicar"}]'::jsonb, 'C', 2, 'numerica', '6 × 4 es sumar 4 veces el 6: 24.')
  ON CONFLICT (codigo) DO NOTHING;
INSERT INTO hoja_ejercicio (hoja_id, pregunta_id, orden) VALUES
  ((SELECT h.id FROM hoja h JOIN conjunto c ON c.id = h.conjunto_id WHERE c.codigo = 'NUM-N2-C2' AND h.orden = 2), (SELECT id FROM pregunta WHERE codigo = 'K-N2C2-H2-3'), 3)
  ON CONFLICT DO NOTHING;
