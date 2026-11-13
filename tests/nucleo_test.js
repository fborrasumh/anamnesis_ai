/* Pruebas de la lógica pura de AnamnesIA (sin navegador y sin red):  node tests/nucleo_test.js
   Comprueban lo que el código debe pillarle a la IA y la detección de cobertura en los seis idiomas. */
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = path.join(__dirname, '..');
const src = f => fs.readFileSync(path.join(R, 'src', f), 'utf8');
const ctx = {module: {}, t: k => k};                      // t() devuelve la clave: aquí no se prueban traducciones
ctx.module.exports = {};
new Function('module', 't', src('datos.js') + '\n' + src('nucleo.js') + '\nmodule.exports={detectaCobertura,pctCobertura,revisaEval,calificacionDe,anotacionesFuera,resumenProgreso,CHECKLIST,COMPETENCIAS};')(ctx.module, ctx.t);
const N = ctx.module.exports;
let ok = 0;
const prueba = (nombre, fn) => { try { fn(); ok++; console.log('  ✓ ' + nombre); } catch (e) { console.log('  ✗ ' + nombre + '\n      ' + e.message); process.exitCode = 1; } };

console.log('Cobertura detectada por código');
prueba('es: reconoce enfermedad actual y hábitos', () => {
  const r = N.detectaCobertura('Me empezó hace tres semanas y empeora cuando ando. Fumo algo.', 'es');
  assert(r.includes('ea'), 'falta ea'); assert(r.includes('habitos'), 'falta habitos');
});
prueba('seis idiomas: cada uno detecta algo en su propia frase', () => {
  const frases = {
    es: 'Me duele desde hace dos días y tomo pastillas para la tensión.',
    ca: 'Em fa mal des de fa dos dies i prenc pastilles per a la tensió.',
    en: 'I have had pain for two days and I take pills for my blood pressure.',
    pt: 'Tenho dor há dois dias e tomo comprimidos para a tensão.',
    fr: 'J’ai mal depuis deux jours et je prends des comprimés pour la tension.',
    de: 'Ich habe seit zwei Tagen Schmerzen und ich nehme Tabletten gegen den Blutdruck.'
  };
  for (const [lg, frase] of Object.entries(frases)) {
    const r = N.detectaCobertura(frase, lg);
    assert(r.includes('medicacion'), `${lg}: no detecta medicación en «${frase}»`);
    assert(r.length >= 2, `${lg}: solo detecta ${r.length} apartado(s)`);
  }
});
prueba('no inventa cobertura con texto neutro', () => {
  assert.deepStrictEqual(N.detectaCobertura('Mmm.', 'es'), []);
});
prueba('porcentaje de cobertura', () => {
  assert.strictEqual(N.pctCobertura({}), 0);
  const todo = {}; N.CHECKLIST.forEach(i => todo[i.id] = 'hecho');
  assert.strictEqual(N.pctCobertura(todo), 100);
});

console.log('\nEl código comprueba lo que devuelve la IA');
const evalBase = (extra = {}) => Object.assign({
  puntuacion_global: 7, calificacion: 'Notable', puntuacion_checklist: 70,
  checklist: Object.fromEntries(N.CHECKLIST.map(i => [i.id, {estado: 'completo', puntos: i.w, max: i.w, observacion: ''}])),
  competencias: Object.fromEntries(N.COMPETENCIAS.map(c => [c.id, {puntuacion: 7, comentario: ''}])),
  rubrica: [], anotaciones_transcripcion: [], resumen: '', fortalezas: [], areas_mejora: [],
  hipotesis_valoracion: {coincide: 'parcial', comentario: ''}, recomendaciones_aprendizaje: []
}, extra);

prueba('recorta los puntos que pasan del tope del apartado', () => {
  const raw = evalBase(); raw.checklist.motivo.puntos = 40;          // el tope es 15
  const {ev, avisos} = N.revisaEval(raw);
  assert.strictEqual(ev.checklist.motivo.puntos, 15);
  assert(avisos.some(a => a.tipo === 'tope' && a.campo === 'motivo'), 'no avisa del tope');
});
prueba('rehace la suma del checklist cuando la IA se equivoca', () => {
  const raw = evalBase({puntuacion_checklist: 95});                   // la suma real es 100
  const {ev, avisos} = N.revisaEval(raw);
  assert.strictEqual(ev.puntuacion_checklist, 100);
  assert(avisos.some(a => a.tipo === 'suma'), 'no avisa de la suma');
});
prueba('corrige la calificación que no corresponde a la puntuación', () => {
  const {ev, avisos} = N.revisaEval(evalBase({puntuacion_global: 4.2, calificacion: 'Excelente'}));
  assert.strictEqual(ev.calificacion, 'Insuficiente');
  assert(avisos.some(a => a.tipo === 'calificacion'), 'no avisa de la calificación');
});
prueba('escala de calificaciones', () => {
  assert.strictEqual(N.calificacionDe(0), 'Insuficiente');
  assert.strictEqual(N.calificacionDe(4.9), 'Insuficiente');
  assert.strictEqual(N.calificacionDe(5), 'Suficiente');
  assert.strictEqual(N.calificacionDe(7), 'Notable');
  assert.strictEqual(N.calificacionDe(9), 'Excelente');
});
prueba('acepta números escritos como texto y con coma decimal', () => {
  const {ev} = N.revisaEval(evalBase({puntuacion_global: '6,5'}));
  assert.strictEqual(ev.puntuacion_global, 6.5);
  assert.strictEqual(ev.calificacion, 'Suficiente');
});
prueba('competencias fuera de rango se recortan a 10', () => {
  const raw = evalBase(); raw.competencias.empatia.puntuacion = 47;
  const {ev, avisos} = N.revisaEval(raw);
  assert.strictEqual(ev.competencias.empatia.puntuacion, 10);
  assert(avisos.some(a => a.campo === 'empatia'));
});
prueba('estado inválido pasa a «no explorado» y apartado ausente no rompe', () => {
  const raw = evalBase(); raw.checklist.ea.estado = 'buenísimo'; delete raw.checklist.af;
  const {ev} = N.revisaEval(raw);
  assert.strictEqual(ev.checklist.ea.estado, 'no_explorado');
  assert.strictEqual(ev.checklist.af.puntos, 0);
  assert.strictEqual(ev.checklist.af.max, 10);
});
prueba('nivel de rúbrica se limita a 0-3', () => {
  const {ev} = N.revisaEval(evalBase({rubrica: [{dimension: 'X', nivel: 9, descripcion_nivel: ['a', 'b', 'c', 'd'], feedback: ''}]}));
  assert.strictEqual(ev.rubrica[0].nivel, 3);
});
prueba('anotaciones que apuntan a turnos inexistentes se detectan', () => {
  const {ev} = N.revisaEval(evalBase({anotaciones_transcripcion: [{turno: 2, tipo: 'abierta'}, {turno: 9, tipo: 'cerrada'}]}));
  assert.strictEqual(N.anotacionesFuera(ev, 4).length, 1);
  assert.strictEqual(N.anotacionesFuera(ev, 9).length, 0);
});
prueba('una evaluación vacía no rompe la app', () => {
  const {ev} = N.revisaEval({});
  assert.strictEqual(ev.puntuacion_checklist, 0);
  assert.strictEqual(ev.calificacion, 'Insuficiente');
  assert.strictEqual(ev.rubrica.length, 0);
});
prueba('una evaluación correcta no genera avisos', () => {
  const {avisos} = N.revisaEval(evalBase({puntuacion_global: 7, calificacion: 'Notable', puntuacion_checklist: 100}));
  assert.strictEqual(avisos.length, 0, 'avisos inesperados: ' + JSON.stringify(avisos));
});

console.log('\nProgreso');
prueba('resumen de sesiones', () => {
  const s = [{puntuacion: 8, elapsed: 600, competencias: {empatia: {puntuacion: 9}}}, {puntuacion: 6, elapsed: 600, competencias: {empatia: {puntuacion: 5}}}];
  const r = N.resumenProgreso(s);
  assert.strictEqual(r.n, 2); assert.strictEqual(r.media, 7); assert.strictEqual(r.mejor, 8);
  assert.strictEqual(r.minutos, 20); assert.strictEqual(r.competencias.empatia, 7);
});
prueba('sin sesiones no divide por cero', () => { assert.strictEqual(N.resumenProgreso([]).media, 0); });

console.log(`\n${ok} pruebas superadas${process.exitCode ? ' · HAY FALLOS' : ''}`);
