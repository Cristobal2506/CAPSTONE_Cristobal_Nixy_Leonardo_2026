-- v15: comparaciones de fracciones con solo las DOS fracciones del enunciado (mismo criterio que v13 aplicó a números enteros).
-- Antes ofrecían distractores ajenos a la pregunta (p. ej. 82/101 al comparar 81/100 y 82/100). Idempotente: fija valores por código.
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "81/100", "tipo_error": null}, {"clave": "B", "texto": "82/100", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C1H1Q2';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "1/3", "tipo_error": null}, {"clave": "B", "texto": "2/3", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C1H1Q4';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "3/5", "tipo_error": null}, {"clave": "B", "texto": "4/5", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C1H2Q1';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "4/8", "tipo_error": null}, {"clave": "B", "texto": "5/8", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C1H2Q3';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "1/12", "tipo_error": null}, {"clave": "B", "texto": "2/12", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C1H2Q5';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "2/4", "tipo_error": null}, {"clave": "B", "texto": "3/4", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C2H1Q1';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "4/6", "tipo_error": null}, {"clave": "B", "texto": "5/6", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C2H1Q3';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "7/10", "tipo_error": null}, {"clave": "B", "texto": "8/10", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C2H1Q5';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "98/100", "tipo_error": null}, {"clave": "B", "texto": "99/100", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C2H2Q2';
UPDATE pregunta SET opciones='[{"clave": "A", "texto": "2/5", "tipo_error": null}, {"clave": "B", "texto": "3/5", "tipo_error": null}]'::jsonb,respuesta_correcta='B' WHERE codigo='V12-U3C2H2Q5';
