// Motor de aprendizaje Kumon (2.ª revisión del cliente).
//   CU09 tanda diaria · CU11 acierto y tiempo por intento · CU12 corregir hasta dejar todo correcto
//   CU13 avanzar / repetir / retroceder según el estándar · CU10 progresión lineal (el «camino»)
//
// Ciclo de una tanda (= un conjunto de hojas):
//   1. El estudiante responde todos los ejercicios (primera vuelta). Cada hoja parte con un ejemplo resuelto.
//      No se le dice si acertó mientras responde: como en la hoja de papel.
//   2. «Revisar»: se marcan los incorrectos SIN mostrar la respuesta correcta ni explicar.
//   3. Corrige solo los marcados y vuelve a revisar, hasta dejar todo correcto.
//   4. Con la primera vuelta se mide acierto y tiempo (medido en el servidor) y se decide:
//        cumple el estándar → avanzar · acierto muy bajo → retroceder · si no → repetir el MISMO conjunto.
const db = require('../db');
const config = require('../config');
const { badRequest, conflict, notFound } = require('./errors');
const numerica = require('./respuestaNumerica');

// v16.3: un ejercicio de lección se responde escribiendo si su respuesta es un número configurado.
const esEscrito = (p) => Boolean(p.formato_respuesta && p.formato_respuesta !== 'alternativas' && p.respuesta_numerica != null);

/** Secuencia fija de conjuntos activos, en orden (nivel → conjunto). */
async function secuencia(client = db) {
  const { rows } = await client.query(
    `SELECT c.id, c.codigo, c.titulo, c.objetivo_aprendizaje, c.tiempo_estandar_seg, c.orden,
            n.id AS nivel_id, n.codigo AS nivel_codigo, n.nombre AS nivel_nombre, n.orden AS nivel_orden
     FROM conjunto c JOIN nivel n ON n.id = c.nivel_id
     WHERE c.activo ORDER BY n.orden, c.orden`,
  );
  return rows;
}

/** Posición del estudiante; si nunca ha practicado, parte en el primer conjunto (el diagnóstico, CU20, la ajustará). */
async function posicion(estudianteId, client = db) {
  const { rows } = await client.query('SELECT * FROM estudiante_posicion WHERE estudiante_id = $1', [estudianteId]);
  if (rows[0]) return rows[0];
  const [primero] = await secuencia(client);
  if (!primero) throw conflict('Todavía no hay conjuntos de hojas cargados', 'SIN_SECUENCIA');
  const { rows: nueva } = await client.query(
    `INSERT INTO estudiante_posicion (estudiante_id, conjunto_id, punto_partida_id) VALUES ($1, $2, $2)
     ON CONFLICT (estudiante_id) DO UPDATE SET estudiante_id = EXCLUDED.estudiante_id RETURNING *`,
    [estudianteId, primero.id],
  );
  return nueva[0];
}

/** Hojas del conjunto, cada una con su ejemplo resuelto y sus ejercicios (sin respuesta ni tipos de error). */
async function hojasDe(conjuntoId) {
  const { rows } = await db.query(
    `SELECT h.id AS hoja_id, h.orden AS hoja_orden, h.ejemplo_enunciado, h.ejemplo_resolucion,
            p.id AS pregunta_id, p.enunciado, p.opciones, he.orden,
            p.formato_respuesta, p.respuesta_numerica, p.respuesta_prefijo, p.respuesta_sufijo
     FROM hoja h JOIN hoja_ejercicio he ON he.hoja_id = h.id JOIN pregunta p ON p.id = he.pregunta_id
     WHERE h.conjunto_id = $1 ORDER BY h.orden, he.orden`,
    [conjuntoId],
  );
  const hojas = [];
  for (const r of rows) {
    let h = hojas.find((x) => x.id === r.hoja_id);
    if (!h) {
      h = { id: r.hoja_id, orden: r.hoja_orden, ejemplo: { enunciado: r.ejemplo_enunciado, resolucion: r.ejemplo_resolucion }, ejercicios: [] };
      hojas.push(h);
    }
    // Nunca se envía la respuesta correcta. Un ejercicio escrito no lleva alternativas.
    const escrito = esEscrito(r);
    h.ejercicios.push({
      id: Number(r.pregunta_id), enunciado: r.enunciado,
      formatoRespuesta: escrito ? r.formato_respuesta : 'alternativas',
      prefijo: escrito ? r.respuesta_prefijo || null : null,
      sufijo: escrito ? r.respuesta_sufijo || null : null,
      opciones: escrito ? [] : r.opciones.map((o) => ({ clave: o.clave, texto: o.texto })),
    });
  }
  return hojas;
}

const preguntasDe = (hojas) => hojas.flatMap((h) => h.ejercicios.map((e) => e.id));

/** Preguntas que hay que responder en la ronda actual: todas en la 1.ª; en las siguientes, las incorrectas de la anterior. */
async function pendientesDeRonda(intento, todas) {
  if (intento.ronda === 1) return todas;
  const { rows } = await db.query(
    'SELECT pregunta_id FROM intento_respuesta WHERE intento_id = $1 AND ronda = $2 AND NOT es_correcta',
    [intento.id, intento.ronda - 1],
  );
  return rows.map((r) => Number(r.pregunta_id));
}

async function respuestasDeRonda(intentoId, ronda) {
  const { rows } = await db.query(
    'SELECT pregunta_id, opcion_elegida, respuesta_texto, es_correcta FROM intento_respuesta WHERE intento_id = $1 AND ronda = $2',
    [intentoId, ronda],
  );
  return rows;
}

const intentoPublico = (i) => ({
  id: Number(i.id),
  conjuntoId: i.conjunto_id,
  repeticion: i.repeticion,
  ronda: i.ronda,
  iniciadoEn: i.iniciado_en,
  total: i.total,
  tiempoEstandarSeg: i.tiempo_estandar_seg,
  terminado: Boolean(i.terminado_en),
});

const resultadoDe = (i) => i.terminado_en && ({
  correctasPrimeraVuelta: i.correctas_primera,
  total: i.total,
  tiempoSeg: i.tiempo_seg,
  tiempoEstandarSeg: i.tiempo_estandar_seg,
  rondas: i.ronda,
  cumpleEstandar: i.cumple_estandar,
  decision: i.decision,
});

/** Estado completo de una tanda para mostrarla (o retomarla) en la app. */
async function tandaParaHacer(intento) {
  const { rows: c } = await db.query(
    `SELECT c.codigo, c.titulo, c.objetivo_aprendizaje, n.nombre AS nivel
     FROM conjunto c JOIN nivel n ON n.id = c.nivel_id WHERE c.id = $1`,
    [intento.conjunto_id],
  );
  const hojas = await hojasDe(intento.conjunto_id);
  const pendientes = intento.terminado_en ? [] : await pendientesDeRonda(intento, preguntasDe(hojas));
  const actuales = await respuestasDeRonda(intento.id, intento.ronda);
  // Ejercicios ya correctos (en cualquier ronda anterior) — la app los muestra con ✔ y bloqueados.
  const { rows: correctas } = await db.query(
    'SELECT DISTINCT pregunta_id FROM intento_respuesta WHERE intento_id = $1 AND ronda < $2 AND es_correcta',
    [intento.id, intento.ronda],
  );
  return {
    ...intentoPublico(intento),
    conjunto: { codigo: c[0].codigo, titulo: c[0].titulo, objetivoAprendizaje: c[0].objetivo_aprendizaje, nivel: c[0].nivel },
    hojas,
    pendientes,
    // Lo que ya eligió en esta ronda (para retomar). No dice si está bien: eso solo se sabe al revisar.
    respuestas: actuales.map((r) => ({ preguntaId: Number(r.pregunta_id), opcion: r.opcion_elegida, respuesta: r.respuesta_texto })),
    correctasAnteriores: correctas.map((r) => Number(r.pregunta_id)),
    resultado: resultadoDe(intento) || null,
  };
}

/** CU09 — Empieza la tanda del conjunto actual o retoma la que quedó abierta. */
async function iniciarTanda(estudianteId, conjuntoId = null) {
  const pos = await posicion(estudianteId);
  // v16.1: jugar la lección en la que está el alumno nunca es un «repaso», aunque ya la haya dominado antes
  // (p. ej. tras retroceder): así su resultado vuelve a hacerlo avanzar.
  const repaso = conjuntoId != null && Number(conjuntoId) !== Number(pos.conjunto_id);
  let elegido = pos.conjunto_id;
  if(repaso){
    const {rows:permiso}=await db.query(`SELECT i.conjunto_id FROM intento i JOIN conjunto c ON c.id=i.conjunto_id
      WHERE i.estudiante_id=$1 AND i.conjunto_id=$2 AND i.terminado_en IS NOT NULL AND i.cumple_estandar=TRUE
      AND c.activo LIMIT 1`,[estudianteId,conjuntoId]);
    if(!permiso.length)throw conflict('Solo puedes repasar una leccion que ya dominaste.','REPASO_BLOQUEADO');
    elegido=conjuntoId;
  }
  if (!repaso && pos.cierre_nivel_pendiente) {
    throw conflict('Terminaste las hojas de esta unidad. Rinde su prueba y espera la revisión de tu profesor.', 'CIERRE_NIVEL_PENDIENTE');
  }
  const seq = await secuencia();
  const actualIdx = seq.findIndex((c) => c.id === pos.conjunto_id);
  if (!repaso && actualIdx === seq.length - 1) {
    const { rows: historial } = await db.query(
      `SELECT 1 FROM evaluacion_intento ei JOIN evaluacion e ON e.id=ei.evaluacion_id
       WHERE ei.estudiante_id=$1 AND e.tipo='unidad' AND e.nivel_id=$2 AND ei.autorizado=TRUE LIMIT 1`,
      [estudianteId, seq[actualIdx].nivel_id]);
    if (historial.length) throw conflict('¡Ya completaste las cinco unidades! Entra al ensayo final.', 'ENSAYO_DISPONIBLE');
  }
  const { rows: abiertos } = await db.query(
    'SELECT * FROM intento WHERE estudiante_id = $1 AND conjunto_id = $2 AND terminado_en IS NULL ORDER BY iniciado_en DESC LIMIT 1',
    [estudianteId, elegido],
  );
  if (abiertos[0]) return { tanda: await tandaParaHacer(abiertos[0]), retomada: true };

  const hojas = await hojasDe(elegido);
  if (!hojas.length) throw conflict('Este conjunto todavía no tiene hojas', 'CONJUNTO_VACIO');
  // v16.3: escribir toma más tiempo que tocar una alternativa: la meta suma segundos por ejercicio escrito.
  const escritos = hojas.flatMap((h) => h.ejercicios).filter((e) => e.formatoRespuesta !== 'alternativas').length;
  const extra = Math.max(0, Math.round(escritos * config.kumon.segundosExtraEscritura));
  const { rows } = await db.query(
    `INSERT INTO intento (estudiante_id, conjunto_id, repeticion, total, tiempo_estandar_seg, repaso)
     SELECT $1, c.id,
            (SELECT COUNT(*) FROM intento i WHERE i.estudiante_id = $1 AND i.conjunto_id = c.id) + 1,
            $3, c.tiempo_estandar_seg + $5, $4
     FROM conjunto c WHERE c.id = $2 RETURNING *`,
    [estudianteId, elegido, preguntasDe(hojas).length, repaso, extra],
  );
  return { tanda: await tandaParaHacer(rows[0]), retomada: false };
}

async function buscarIntento(estudianteId, intentoId) {
  const { rows } = await db.query('SELECT * FROM intento WHERE id = $1 AND estudiante_id = $2', [intentoId, estudianteId]);
  if (!rows[0]) throw notFound('Tanda no encontrada');
  return rows[0];
}

/** Guarda (o cambia) la respuesta de la ronda actual: alternativa o número escrito (v16.3). No revela si es correcta. */
async function responder(estudianteId, intentoId, { preguntaId, opcion, respuesta, trazos, reconocido, confianza }) {
  const intento = await buscarIntento(estudianteId, intentoId);
  if (intento.terminado_en) throw conflict('Esta tanda ya terminó', 'TANDA_TERMINADA');
  const hojas = await hojasDe(intento.conjunto_id);
  if (!preguntasDe(hojas).includes(preguntaId)) {
    throw badRequest('Ese ejercicio no es de esta tanda', 'EJERCICIO_NO_ES_DE_LA_TANDA');
  }
  const pendientes = await pendientesDeRonda(intento, preguntasDe(hojas));
  if (!pendientes.includes(preguntaId)) {
    throw badRequest('Este ejercicio ya está correcto: corrige solo los marcados', 'EJERCICIO_YA_CORRECTO');
  }
  const { rows } = await db.query(
    'SELECT opciones, respuesta_correcta, formato_respuesta, respuesta_numerica, forma_exacta FROM pregunta WHERE id = $1', [preguntaId]);
  if (esEscrito(rows[0])) {
    const p = rows[0];
    const texto = numerica.normalizar(respuesta, p.formato_respuesta);
    if (texto == null) {
      throw badRequest(p.formato_respuesta === 'fraccion' ? 'Escribe una fracción como 3/4.' : 'Escribe solo números.', 'RESPUESTA_INVALIDA');
    }
    const correcta = numerica.esCorrecta(texto, p.respuesta_numerica, p.formato_respuesta, p.forma_exacta);
    // Si lo escrito coincide con un distractor, se registra su tipo de error (mismo análisis que con alternativas).
    const distractor = correcta ? null : p.opciones.find((o) => o.clave !== p.respuesta_correcta
      && numerica.deducir(o.texto) && numerica.esCorrecta(texto, numerica.deducir(o.texto).respuesta, p.formato_respuesta));
    await db.query(
      `INSERT INTO intento_respuesta (intento_id, pregunta_id, ronda, opcion_elegida, respuesta_texto, trazos, reconocido, confianza, es_correcta, tipo_error)
       VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (intento_id, pregunta_id, ronda) DO UPDATE SET
         opcion_elegida = NULL, respuesta_texto = EXCLUDED.respuesta_texto, trazos = EXCLUDED.trazos,
         reconocido = EXCLUDED.reconocido, confianza = EXCLUDED.confianza, es_correcta = EXCLUDED.es_correcta,
         tipo_error = EXCLUDED.tipo_error, respondida_en = now()`,
      [intento.id, preguntaId, intento.ronda, texto, trazos ? JSON.stringify(trazos) : null, reconocido ?? null,
        confianza ?? null, correcta, distractor?.tipo_error ?? null],
    );
    const respondidas = (await respuestasDeRonda(intento.id, intento.ronda)).length;
    return { ronda: intento.ronda, respondidas, porResponder: pendientes.length - respondidas, respuesta: texto };
  }
  const elegida = rows[0].opciones.find((o) => o.clave === opcion);
  if (!elegida) throw badRequest('Esa opción no existe', 'OPCION_INVALIDA');
  const correcta = opcion === rows[0].respuesta_correcta;
  await db.query(
    `INSERT INTO intento_respuesta (intento_id, pregunta_id, ronda, opcion_elegida, es_correcta, tipo_error)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (intento_id, pregunta_id, ronda) DO UPDATE SET
       opcion_elegida = EXCLUDED.opcion_elegida, respuesta_texto = NULL, trazos = NULL, reconocido = NULL, confianza = NULL,
       es_correcta = EXCLUDED.es_correcta, tipo_error = EXCLUDED.tipo_error, respondida_en = now()`,
    [intento.id, preguntaId, intento.ronda, opcion, correcta, correcta ? null : elegida.tipo_error ?? null],
  );
  const respondidas = (await respuestasDeRonda(intento.id, intento.ronda)).length;
  return { ronda: intento.ronda, respondidas, porResponder: pendientes.length - respondidas };
}

/** CU13 — Avanzar, repetir o retroceder, y mover la posición del estudiante. */
async function decidir(client, intento) {
  if(intento.repaso){
    await client.query("UPDATE intento SET decision='repasar' WHERE id=$1",[intento.id]);
    return 'repasar';
  }
  const seq = await secuencia(client);
  const i = seq.findIndex((c) => c.id === intento.conjunto_id);
  const pos = await posicion(intento.estudiante_id, client);
  const acierto = intento.correctas_primera / intento.total;
  let decision;
  let siguiente = intento.conjunto_id;
  let cierrePendiente = false;
  if (intento.cumple_estandar) {
    decision = 'avanzar';
    const prox = seq[i + 1];
    if (!prox || prox.nivel_id !== seq[i].nivel_id) {
      // La posición NO avanza a la siguiente unidad hasta aprobar prueba y revisión docente.
      cierrePendiente = true;
    } else { siguiente = prox.id; }
  } else if (acierto < config.kumon.umbralRetroceso && i > 0 && seq[i - 1].nivel_id === seq[i].nivel_id) {
    decision = 'retroceder';
    siguiente = seq[i - 1].id;
  } else {
    decision = 'repetir';
  }
  // Intentos seguidos de este conjunto sin alcanzar el estándar (desde el último que lo cumplió).
  let requiereProfesor = false;
  if (decision !== 'avanzar') {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM intento
       WHERE estudiante_id = $1 AND conjunto_id = $2 AND terminado_en IS NOT NULL AND NOT cumple_estandar
         AND iniciado_en > COALESCE((SELECT MAX(iniciado_en) FROM intento WHERE estudiante_id = $1
                                     AND conjunto_id = $2 AND cumple_estandar), '-infinity')`,
      [intento.estudiante_id, intento.conjunto_id],
    );
    requiereProfesor = rows[0].n >= config.kumon.maxIntentosSinEstandar || pos.requiere_profesor;
  }
  await client.query('UPDATE intento SET decision = $2 WHERE id = $1', [intento.id, decision]);
  await client.query(
    `UPDATE estudiante_posicion SET conjunto_id = $2, cierre_nivel_pendiente = $3, requiere_profesor = $4,
       actualizado_en = now() WHERE estudiante_id = $1`,
    [intento.estudiante_id, siguiente, cierrePendiente, requiereProfesor],
  );
  return decision;
}

/** CU12 — Revisa la ronda: marca los incorrectos (sin decir la correcta). Si todo está bien, cierra la tanda. */
async function revisar(estudianteId, intentoId) {
  return db.transaction(async (client) => {
    const { rows: bloqueo } = await client.query(
      'SELECT * FROM intento WHERE id = $1 AND estudiante_id = $2 FOR UPDATE', [intentoId, estudianteId]);
    const intento = bloqueo[0];
    if (!intento) throw notFound('Tanda no encontrada');
    if (intento.terminado_en) throw conflict('Esta tanda ya terminó', 'TANDA_TERMINADA');

    const hojas = await hojasDe(intento.conjunto_id);
    const pendientes = await pendientesDeRonda(intento, preguntasDe(hojas));
    const { rows: resp } = await client.query(
      'SELECT pregunta_id, es_correcta FROM intento_respuesta WHERE intento_id = $1 AND ronda = $2',
      [intento.id, intento.ronda],
    );
    const respondidas = new Set(resp.map((r) => Number(r.pregunta_id)));
    const faltan = pendientes.filter((id) => !respondidas.has(id));
    if (faltan.length) {
      throw badRequest(`Te falta${faltan.length === 1 ? '' : 'n'} ${faltan.length} ejercicio${faltan.length === 1 ? '' : 's'} por responder`, 'FALTAN_RESPUESTAS');
    }
    const incorrectas = resp.filter((r) => !r.es_correcta).map((r) => Number(r.pregunta_id));

    // CU11 — La primera vuelta define el acierto y el tiempo (medido en el servidor).
    if (intento.ronda === 1) {
      const { rows } = await client.query(
        `UPDATE intento SET primera_revision_en = now(), correctas_primera = $2,
           tiempo_seg = GREATEST(1, EXTRACT(EPOCH FROM (now() - iniciado_en))::int)
         WHERE id = $1 RETURNING *`,
        [intento.id, intento.total - incorrectas.length],
      );
      Object.assign(intento, rows[0]);
    }

    if (incorrectas.length) {
      const { rows } = await client.query('UPDATE intento SET ronda = ronda + 1 WHERE id = $1 RETURNING ronda', [intento.id]);
      return { terminado: false, ronda: rows[0].ronda, aCorregir: incorrectas, correctas: pendientes.filter((id) => !incorrectas.includes(id)) };
    }

    const cumple = intento.correctas_primera / intento.total >= config.kumon.umbralAcierto
      && intento.tiempo_seg <= intento.tiempo_estandar_seg;
    const { rows: fin } = await client.query(
      'UPDATE intento SET terminado_en = now(), cumple_estandar = $2 WHERE id = $1 RETURNING *', [intento.id, cumple]);
    const decision = await decidir(client, fin[0]);
    return { terminado: true, resultado: resultadoDe({ ...fin[0], decision }) };
  });
}

/** CU10 — El camino: niveles y conjuntos en orden, con el estado de cada uno para este estudiante. */
async function camino(estudianteId) {
  const pos = await posicion(estudianteId);
  const seq = await secuencia();
  const { rows: stats } = await db.query(
    `SELECT conjunto_id, COUNT(*) FILTER (WHERE terminado_en IS NOT NULL)::int AS intentos,
            BOOL_OR(cumple_estandar) AS dominado,
            MIN(tiempo_seg) FILTER (WHERE cumple_estandar) AS mejor_tiempo_seg
     FROM intento WHERE estudiante_id = $1 GROUP BY conjunto_id`,
    [estudianteId],
  );
  const por = new Map(stats.map((s) => [s.conjunto_id, s]));
  const {rows:om}=await db.query('SELECT nivel_id FROM unidad_omitida_diagnostico WHERE estudiante_id=$1',[estudianteId]);
  const omitidos=new Set(om.map(r=>Number(r.nivel_id)));
  const { rows: abierto } = await db.query(
    'SELECT id FROM intento WHERE estudiante_id = $1 AND conjunto_id = $2 AND terminado_en IS NULL LIMIT 1',
    [estudianteId, pos.conjunto_id],
  );
  const niveles = [];
  for (const c of seq) {
    let n = niveles.find((x) => x.id === c.nivel_id);
    if (!n) { n = { id: c.nivel_id, codigo: c.nivel_codigo, nombre: c.nivel_nombre, conjuntos: [] }; niveles.push(n); }
    const s = por.get(c.id);
    // v16.1: la lección de la posición SIEMPRE es la «actual», aunque ya se haya dominado antes (retroceso)
    // o pertenezca a una unidad omitida: así el alumno nunca se queda sin una lección para jugar.
    const esActual = Number(c.id) === Number(pos.conjunto_id) && !pos.cierre_nivel_pendiente;
    const estado = esActual?'actual':omitidos.has(Number(c.nivel_id))?'omitido':s?.dominado?'dominado'
      :c.id === pos.conjunto_id?'actual':'bloqueado';
    n.conjuntos.push({
      id: c.id, codigo: c.codigo, titulo: c.titulo, objetivoAprendizaje: c.objetivo_aprendizaje,
      tiempoEstandarSeg: c.tiempo_estandar_seg, estado,
      intentos: s?.intentos ?? 0, mejorTiempoSeg: s?.mejor_tiempo_seg ?? null,
      yaDominado: Boolean(s?.dominado),
    });
  }
  for (const n of niveles) {
    n.estado = n.conjuntos.some((c) => c.estado === 'actual') ? 'actual'
      : n.conjuntos.every((c) => c.estado === 'omitido') ? 'omitido'
      : n.conjuntos.every((c) => c.estado === 'dominado') ? 'dominado' : 'bloqueado';
  }
  const {rows:fin} = await db.query(`SELECT 1 FROM evaluacion_intento i JOIN evaluacion e ON e.id=i.evaluacion_id
    WHERE i.estudiante_id=$1 AND e.tipo='unidad' AND e.nivel_id=(SELECT id FROM nivel WHERE codigo='SIMCE-U5')
      AND i.autorizado=TRUE LIMIT 1`,[estudianteId]);
  return {
    niveles,
    ensayoDisponible: fin.length>0,
    conjuntoActualId: pos.conjunto_id,
    tandaAbiertaId: abierto[0] ? Number(abierto[0].id) : null,
    cierreNivelPendiente: pos.cierre_nivel_pendiente,
    requiereProfesor: pos.requiere_profesor,
  };
}

module.exports = { secuencia, posicion, iniciarTanda, responder, revisar, camino, buscarIntento, tandaParaHacer, hojasDe };
