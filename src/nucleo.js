/* ══ Lógica pura de AnamnesIA: sin DOM y sin red, para poder probarla en Node.
      Aquí vive la parte de «la IA propone, el código comprueba»: la IA redacta la evaluación,
      pero las sumas, los topes y la coherencia de la calificación los rehace el código. ══ */

/* ── cobertura de la anamnesis, detectada en lo que responde el paciente ── */
function detectaCobertura(texto, lang) {
  const tabla = COBERTURA[lang] || COBERTURA.es, s = String(texto || '').toLowerCase(), fuera = [];
  for (const [id, palabras] of Object.entries(tabla)) if (palabras.some(p => s.includes(p))) fuera.push(id);
  return fuera;
}
const pctCobertura = cls => Math.round(CHECKLIST.filter(it => cls[it.id] === 'hecho').length / CHECKLIST.length * 100);

/* ── comprobaciones del código sobre lo que devuelve la IA ──
   Devuelve la evaluación saneada y la lista de avisos (qué tuvo que corregir el código). */
const ESTADOS = ['completo', 'parcial', 'no_explorado'];
const num = (x, min, max, pordefecto = 0) => {
  const v = typeof x === 'number' ? x : parseFloat(String(x ?? '').replace(',', '.'));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : pordefecto;
};
/* Calificación que corresponde a la puntuación, según la escala de la app (0-10). */
function calificacionDe(p) { return p < 5 ? CALIFICACIONES[0] : p < 7 ? CALIFICACIONES[1] : p < 9 ? CALIFICACIONES[2] : CALIFICACIONES[3]; }

function revisaEval(raw) {
  const ev = JSON.parse(JSON.stringify(raw || {})), avisos = [];

  /* checklist: cada apartado tiene su tope fijo; la suma la calcula el código, no la IA */
  ev.checklist = ev.checklist && typeof ev.checklist === 'object' ? ev.checklist : {};
  let suma = 0;
  for (const it of CHECKLIST) {
    const d = ev.checklist[it.id] || {};
    const estado = ESTADOS.includes(d.estado) ? d.estado : 'no_explorado';
    const brutos = num(d.puntos, 0, 1e6, 0);
    const puntos = Math.min(brutos, it.w);
    if (brutos > it.w) avisos.push({tipo: 'tope', campo: it.id, dado: brutos, max: it.w});
    ev.checklist[it.id] = {estado, puntos, max: it.w, observacion: String(d.observacion || '')};
    suma += puntos;
  }
  const dichoChecklist = num(ev.puntuacion_checklist, 0, 1e6, suma);
  if (Math.abs(dichoChecklist - suma) >= 1) avisos.push({tipo: 'suma', campo: 'puntuacion_checklist', dado: dichoChecklist, calculado: suma});
  ev.puntuacion_checklist = suma;          // manda la suma del código

  /* competencias: 0-10 */
  ev.competencias = ev.competencias && typeof ev.competencias === 'object' ? ev.competencias : {};
  for (const c of COMPETENCIAS) {
    const d = ev.competencias[c.id] || {};
    const bruta = num(d.puntuacion, 0, 1e6, 0);
    if (bruta > 10) avisos.push({tipo: 'tope', campo: c.id, dado: bruta, max: 10});
    ev.competencias[c.id] = {puntuacion: Math.min(bruta, 10), comentario: String(d.comentario || '')};
  }

  /* puntuación global y calificación: se comprueba que concuerden entre sí */
  ev.puntuacion_global = num(ev.puntuacion_global, 0, 10, Math.round(suma / 10 * 10) / 10);
  const correcta = calificacionDe(ev.puntuacion_global);
  if (ev.calificacion !== correcta) {
    if (ev.calificacion) avisos.push({tipo: 'calificacion', dado: String(ev.calificacion), calculado: correcta, puntuacion: ev.puntuacion_global});
    ev.calificacion = correcta;            // manda la escala del código
  }

  /* rúbrica: nivel 0-3 y cuatro descripciones */
  ev.rubrica = Array.isArray(ev.rubrica) ? ev.rubrica.filter(r => r && r.dimension).map(r => ({
    dimension: String(r.dimension), icono: String(r.icono || '•'), nivel: Math.round(num(r.nivel, 0, 3, 0)),
    descripcion_nivel: Array.isArray(r.descripcion_nivel) ? r.descripcion_nivel.slice(0, 4).map(x => String(x || '')) : [],
    feedback: String(r.feedback || '')
  })) : [];

  /* anotaciones de la transcripción: solo turnos del estudiante que existen de verdad */
  ev.anotaciones_transcripcion = Array.isArray(ev.anotaciones_transcripcion) ? ev.anotaciones_transcripcion
    .map(a => ({turno: Math.round(num(a.turno, 1, 999, 0)), tipo: String(a.tipo || ''), etiqueta: String(a.etiqueta || ''), comentario: String(a.comentario || '')}))
    .filter(a => a.turno > 0) : [];

  for (const k of ['fortalezas', 'areas_mejora', 'recomendaciones_aprendizaje']) ev[k] = Array.isArray(ev[k]) ? ev[k].map(x => String(x || '')).filter(Boolean) : [];
  ev.resumen = String(ev.resumen || '');
  const hv = ev.hipotesis_valoracion || {};
  ev.hipotesis_valoracion = {coincide: ['correcto', 'parcial', 'incorrecto'].includes(hv.coincide) ? hv.coincide : 'parcial', comentario: String(hv.comentario || '')};
  return {ev, avisos};
}

/* Anotaciones que la IA sitúa en un turno que no existe: se avisa, no se descartan en silencio. */
function anotacionesFuera(ev, nTurnos) { return (ev.anotaciones_transcripcion || []).filter(a => a.turno > nTurnos); }

/* ── progreso ── */
function resumenProgreso(sesiones) {
  const n = sesiones.length;
  if (!n) return {n: 0, media: 0, mejor: 0, minutos: 0, competencias: {}};
  const comp = {};
  for (const c of COMPETENCIAS) comp[c.id] = sesiones.reduce((s, x) => s + (x.competencias?.[c.id]?.puntuacion || 0), 0) / n;
  return {
    n, media: sesiones.reduce((s, x) => s + (x.puntuacion || 0), 0) / n,
    mejor: Math.max(...sesiones.map(x => x.puntuacion || 0)),
    minutos: Math.round(sesiones.reduce((s, x) => s + (x.elapsed || 0), 0) / 60),
    competencias: comp
  };
}

if (typeof module !== 'undefined' && module.exports) module.exports = {detectaCobertura, pctCobertura, revisaEval, calificacionDe, anotacionesFuera, resumenProgreso};
