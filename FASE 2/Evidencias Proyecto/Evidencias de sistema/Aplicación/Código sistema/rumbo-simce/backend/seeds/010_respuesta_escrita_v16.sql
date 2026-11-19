-- v16: respuesta escrita a mano (dedo o lápiz) en el diagnóstico y los facsímiles (pruebas de unidad y ensayo).
-- Idempotente: puede ejecutarse varias veces (npm run db:seed).
-- Las alternativas NO se borran: las lecciones Kumon siguen usándolas y sirven de respaldo.

-- El esquema (columnas nuevas) está en migrations/013_respuesta_escrita_v16.sql.

-- 1) Diagnóstico, pruebas de unidad y ensayo final pasan a respuesta escrita ----------------
-- Solo las evaluaciones vigentes: un diagnóstico antiguo (v13) a medio rendir se termina con alternativas.
UPDATE evaluacion SET respuesta_escrita = TRUE WHERE tipo IN ('diagnostico','unidad','final') AND activa AND NOT respuesta_escrita;

-- 2) Respuesta numérica de cada pregunta de esas evaluaciones, deducida de la alternativa correcta.
--    Solo se convierten las que tienen un número como respuesta (con unidad o signo $ opcional).
--    Se dejan con alternativas las que necesitan ver las opciones («¿Cuál de los siguientes…?»).
WITH correcta AS (
  SELECT p.id, btrim(o->>'texto') AS t
  FROM pregunta p
  JOIN LATERAL jsonb_array_elements(p.opciones) o ON o->>'clave' = p.respuesta_correcta
  WHERE p.respuesta_numerica IS NULL
    AND p.formato_respuesta = 'alternativas'
    AND p.id IN (SELECT ep.pregunta_id FROM evaluacion_pregunta ep JOIN evaluacion e ON e.id = ep.evaluacion_id
                 WHERE e.tipo IN ('diagnostico','unidad','final') AND e.activa)
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

-- Revisión manual: preguntas de evaluaciones que siguen con alternativas.
-- SELECT p.codigo, p.enunciado FROM pregunta p JOIN evaluacion_pregunta ep ON ep.pregunta_id = p.id
--  JOIN evaluacion e ON e.id = ep.evaluacion_id
--  WHERE e.tipo IN ('diagnostico','unidad','final') AND p.formato_respuesta = 'alternativas' ORDER BY p.codigo;
