-- v13.1: nueva version del diagnostico para NO mutar preguntas de intentos abiertos v13.
-- El diagnostico v13 permanece para entregar los intentos historicos o todavia abiertos.
INSERT INTO evaluacion(codigo,titulo,tipo,nivel_id,umbral,tiempo_limite_seg,activa)
VALUES ('DIAG-INICIAL-V131','Diagnóstico de Matemática · 40 desafíos diferentes','diagnostico',NULL,0.50,3600,TRUE)
ON CONFLICT(codigo) DO UPDATE SET titulo=EXCLUDED.titulo, tiempo_limite_seg=EXCLUDED.tiempo_limite_seg,activa=TRUE;
UPDATE evaluacion SET activa=FALSE WHERE codigo='DIAG-INICIAL';
