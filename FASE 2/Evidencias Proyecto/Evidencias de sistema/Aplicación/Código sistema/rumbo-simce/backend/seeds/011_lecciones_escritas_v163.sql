-- v16.3: los ejercicios de las lecciones del camino (hojas Kumon) pasan a respuesta escrita.
-- Idempotente. Usa la misma regla que la semilla 010: solo los ejercicios cuya respuesta es un número
-- (con unidad o signo $ opcional); los que necesitan ver las opciones («¿Cuál de los siguientes…?»,
-- verdadero/falso) o cuya respuesta no es un número se quedan con alternativas.
-- Las alternativas no se borran: sirven para clasificar el error cuando el alumno escribe un distractor.
-- 1) Corrección (también para bases que ya aplicaron la v16): preguntas con varias respuestas válidas
--    vuelven a alternativas. Con escritura, un alumno que escribe otra respuesta correcta quedaría mal corregido.
UPDATE pregunta SET formato_respuesta = 'alternativas', respuesta_numerica = NULL,
       respuesta_prefijo = NULL, respuesta_sufijo = NULL
WHERE formato_respuesta <> 'alternativas'
  AND (enunciado ~ '[<>≤≥]' OR enunciado ~* '(equival|inecuaci|m[aá]s de .* menos de)');

-- 2) Ejercicios de las lecciones del camino con respuesta numérica pasan a escritura.
WITH correcta AS (
  SELECT p.id, btrim(o->>'texto') AS t
  FROM pregunta p
  JOIN LATERAL jsonb_array_elements(p.opciones) o ON o->>'clave' = p.respuesta_correcta
  WHERE p.respuesta_numerica IS NULL
    AND p.formato_respuesta = 'alternativas'
    AND p.id IN (SELECT he.pregunta_id FROM hoja_ejercicio he JOIN hoja h ON h.id = he.hoja_id
                 JOIN conjunto c ON c.id = h.conjunto_id WHERE c.activo)
    -- v16.3: también las de varias respuestas válidas (desigualdades, rangos, fracciones equivalentes).
    AND p.enunciado !~* '(cu[aá]l(es)?\s+de\s+(l[oa]s|est[oa]s|es[oa]s)|siguientes|alternativa|opci[oó]n|verdader|fals[oa]|equival|inecuaci|m[aá]s de .* menos de)'
    AND p.enunciado !~ '[<>≤≥]'
), partes AS (
  SELECT id,
         (regexp_match(t, '^(\$)?\s*([0-9][0-9., /]*?)\s*([A-Za-zÁÉÍÓÚÑáéíóúñ°%²³]{1,12})?$')) AS m
  FROM correcta
), numero AS (
  SELECT id, m[1] AS prefijo, m[3] AS sufijo,
         CASE WHEN replace(m[2],' ','') ~ '^[0-9]{1,3}(\.[0-9]{3})+$' THEN replace(replace(m[2],' ',''),'.','')
              ELSE replace(m[2],' ','') END AS n
  FROM partes WHERE m IS NOT NULL
)
UPDATE pregunta p SET
  formato_respuesta = CASE WHEN x.n ~ '^[0-9]{1,9}$' THEN 'entero'
                           WHEN x.n ~ '^[0-9]{1,9},[0-9]{1,6}$' THEN 'decimal'
                           ELSE 'fraccion' END,
  respuesta_numerica = CASE WHEN x.n ~ '^[0-9]{1,9}$' THEN (x.n::bigint)::text ELSE x.n END,
  respuesta_prefijo = x.prefijo,
  respuesta_sufijo = x.sufijo
FROM numero x
WHERE p.id = x.id
  AND (x.n ~ '^[0-9]{1,9}$' OR x.n ~ '^[0-9]{1,9},[0-9]{1,6}$' OR x.n ~ '^[0-9]{1,6}/[0-9]{1,6}$');

-- 3) «Fracción simplificada»: se exige esa forma exacta (6/12 no vale; 1/2 sí).
UPDATE pregunta SET forma_exacta = TRUE
WHERE formato_respuesta = 'fraccion' AND enunciado ~* '(simplific|irreducible)' AND NOT forma_exacta;

-- Revisión manual: ejercicios de lecciones que siguen con alternativas.
-- SELECT c.codigo, p.codigo, p.enunciado FROM conjunto c JOIN hoja h ON h.conjunto_id = c.id
--  JOIN hoja_ejercicio he ON he.hoja_id = h.id JOIN pregunta p ON p.id = he.pregunta_id
--  WHERE c.activo AND p.formato_respuesta = 'alternativas' ORDER BY c.codigo, h.orden, he.orden;
