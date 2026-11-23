/* ══ AnamnesIA · lógica de la app.
      La IA encarna al paciente y redacta la evaluación; el código comprueba la cobertura de la anamnesis,
      rehace las sumas y los topes de la evaluación y avisa de lo que no cuadraba (nucleo.js).
      Los textos se escriben en español y se traducen con t(); los diccionarios están en src/i18n.js. ══ */
const STEPS = ['Inicio', 'Preparación', 'Entrevista', 'Evaluación'];
const HUBS = ['Progreso'];
const NAV = [
  ['Empezar una sesión', 'Puedes ver un ejemplo completo sin clave de IA.'],
  ['Siguiente: la entrevista', 'Elige escenario y pulsa «Generar paciente e iniciar».'],
  ['Siguiente: la evaluación', 'Pregunta al paciente y pulsa «Terminar la entrevista».'],
  ['Volver al inicio', 'Descarga tu informe o empieza otra sesión.']
];
const RENDER = {0: pintaInicio, 1: pintaPrep, 2: pintaEntrevista, 3: pintaEval, 4: pintaProgreso};
const GLOS = [
  ['¿Qué es esto?', 'Un entrenador de la entrevista clínica. La IA hace de paciente con una historia que no ves; tú haces la anamnesis y al final comparas tu hipótesis con la historia real. El paciente es ficticio: no uses datos de pacientes reales.'],
  ['Qué comprueba el código', 'Durante la entrevista, qué apartados de la anamnesis aparecen en lo que responde el paciente. En la evaluación, que los puntos de cada apartado no pasen de su tope, que la suma sea correcta y que la calificación corresponda a la puntuación. Si la IA se desvía, verás el aviso.'],
  ['Qué hace la IA', 'Interpreta al paciente, redacta la valoración cualitativa, la rúbrica y las recomendaciones. Puede equivocarse: la nota es orientativa y no sustituye la evaluación del profesorado.'],
  ['Modos de estudio', 'Práctica: checklist visible y evaluación completa. Examen: sin checklist ni pistas, como una estación OSCE. Tutor: una pista discreta cada cinco intercambios si quedan apartados sin explorar.'],
  ['Voz', 'El dictado y la voz del paciente los hace el navegador (Web Speech API): el audio no sale de tu dispositivo. Funciona mejor en Chrome y Edge.'],
  ['Privacidad', 'Tus sesiones y tu progreso se guardan solo en este navegador. Hacia tu proveedor de IA salen tus preguntas y las respuestas del paciente simulado; tu nombre no se envía. Antes del primer envío ves lo que sale.'],
  ['Tu clave de IA', 'Funciona con OpenAI, Google Gemini o Anthropic Claude. La clave se guarda solo en este navegador y cada persona paga su propio uso.']
];

let S = {
  stu: '', sp: 'medicina general', df: 'intermedio', md: 'practica', stt: false, tts: false, ava: false,
  caso: null, his: [], turns: 0, t0: null, elapsed: 0, cls: {}, hyp: '', ev: null, avisos: [],
  esEjemplo: false, sesiones: []
};
let ENVIO_OK = false, cronometro = null, ocupado = false, desdeUltimaPista = 0;

/* ── ejemplo sin clave ───────────────────────────────────────────────────────────────── */
function aplicaEjemplo() {
  const e = ejemploSesion();
  S.caso = e.caso; S.his = e.his.slice(); S.turns = e.turns; S.elapsed = e.elapsed; S.hyp = e.hyp;
  S.ev = e.ev; S.avisos = []; S.esEjemplo = true; S.t0 = null;
  S.cls = {}; S.his.filter(h => h.role === 'assistant').forEach(h => detectaCobertura(h.content, LANG).forEach(id => S.cls[id] = 'hecho'));
}
window.addEventListener('langchange', () => { if (S.esEjemplo) { aplicaEjemplo(); guarda(); (RENDER[step] || (() => {}))(); } });

/* ── pantalla 0 ──────────────────────────────────────────────────────────────────────── */
function pintaInicio() {
  const n = S.sesiones.length;
  const partes = [];
  if (S.caso && !S.ev) partes.push(`${esc(t('Tienes una entrevista a medias.'))} <button class="btn btn-ghost btn-sm" data-ir="2" type="button">${esc(t('Seguir'))}</button>`);
  else if (S.ev) partes.push(`${esc(t('Tienes una evaluación guardada.'))} <button class="btn btn-ghost btn-sm" data-ir="3" type="button">${esc(t('Verla'))}</button>`);
  if (n) partes.push(`${esc(t('{0} sesión(es) en este navegador.', n))} <button class="btn btn-ghost btn-sm" data-ir="4" type="button">${esc(t('Ver progreso'))}</button>`);
  $('inicioProj').innerHTML = partes.join(' · ');
}
$('btnStart').onclick = () => go(1);
$('btnEjemplo').onclick = () => { aplicaEjemplo(); guarda(); go(3); toast(t('Ejemplo de demostración: caso ficticio, sin usar la IA')); };
$('btnProg').onclick = () => go(4);
document.addEventListener('click', e => { const b = e.target.closest('[data-ir]'); if (b) go(+b.dataset.ir); });

/* ── pantalla 1: preparación ─────────────────────────────────────────────────────────── */
function pintaPrep() {
  $('sname').value = S.stu;
  const sel = $('spec');
  sel.innerHTML = ESPECIALIDADES.map(e => `<option value="${esc(e.id)}">${esc(e.i)}  ${esc(t(e.id))}</option>`).join('');
  sel.value = S.sp; pintaDescEsp();
  $('difs').innerHTML = DIFICULTADES.map(d => `<button class="an-opt" type="button" role="radio" data-dif="${d.id}" aria-pressed="${S.df === d.id}" aria-checked="${S.df === d.id}"><span class="an-emoji">${d.i}</span><span><b>${esc(t('dif.' + d.id))}</b><small>${esc(t('dif.' + d.id + '.s'))}</small></span></button>`).join('');
  $('modos').innerHTML = MODOS.map(m => `<button class="an-opt" type="button" role="radio" data-modo="${m.id}" aria-pressed="${S.md === m.id}" aria-checked="${S.md === m.id}"><span class="an-emoji">${m.i}</span><span><b>${esc(t('modo.' + m.id))}</b><small>${esc(t('modo.' + m.id + '.s'))}</small></span></button>`).join('');
  $('mdesc').textContent = t('modo.' + S.md + '.desc');
  $('tSTT').checked = S.stt; $('tTTS').checked = S.tts; $('tAVA').checked = S.ava;
  $('vozNo').hidden = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  $('estadoGen').textContent = '';
}
const pintaDescEsp = () => { $('spdesc').textContent = t('esp.' + S.sp); };
$('sname').addEventListener('input', e => { S.stu = e.target.value; guarda(); });
$('spec').addEventListener('change', e => { S.sp = e.target.value; pintaDescEsp(); guarda(); });
$('difs').addEventListener('click', e => { const b = e.target.closest('[data-dif]'); if (!b) return; S.df = b.dataset.dif; guarda(); pintaPrep(); });
$('modos').addEventListener('click', e => { const b = e.target.closest('[data-modo]'); if (!b) return; S.md = b.dataset.modo; guarda(); pintaPrep(); });
$('tSTT').onchange = e => { S.stt = e.target.checked; guarda(); };
$('tTTS').onchange = e => { S.tts = e.target.checked; guarda(); };
$('tAVA').onchange = e => { S.ava = e.target.checked; guarda(); };

const CAN_NEXT = i => {
  if (i === 1) return S.caso ? true : t('Pulsa «Generar paciente e iniciar» para crear el caso.');
  if (i === 2) return S.ev ? true : t('Termina la entrevista para ver la evaluación.');
  return true;
};

/* pasos del modal «preparando»: 0 = en curso, se van marcando */
function pasosGen(lista, activo) {
  $('genPasos').innerHTML = lista.map((k, i) => `<li class="${i < activo ? 'listo' : i === activo ? 'ahora' : ''}">${esc(t(k))}</li>`).join('');
}
const abreGen = (lista) => { pasosGen(lista, 0); $('mGen').classList.add('on'); };
const cierraGen = () => $('mGen').classList.remove('on');

/* ── aviso previo de envío (una vez por sesión de navegador) ──────────────────────────── */
let envioRes = null;
function pideEnvio(muestra, masks) {
  if (ENVIO_OK) return Promise.resolve(true);
  $('envioInfo').innerHTML = `<p class="help" style="margin-top:0">${esc(t('Tus preguntas y las respuestas del paciente simulado se enviarán a {0} durante la entrevista. Tu nombre no se envía. Se han enmascarado {1} dato(s) personales.', PROV[getProv()].n, masks))}</p><p class="help">${esc(t('Muestra del envío:'))}</p>`;
  $('envioTxt').textContent = muestra.slice(0, 3000) + (muestra.length > 3000 ? '\n…' : '');
  $('envioOk').checked = false; $('envioSi').disabled = true; $('mEnvio').classList.add('on');
  return new Promise(r => { envioRes = r; });
}
function cierraEnvio(v) { $('mEnvio').classList.remove('on'); if (envioRes) { const r = envioRes; envioRes = null; if (v) ENVIO_OK = true; r(v); } }
_cierres.mEnvio = () => cierraEnvio(false);
$('envioOk').onchange = () => { $('envioSi').disabled = !$('envioOk').checked; };
$('envioSi').onclick = () => cierraEnvio(true); $('envioNo').onclick = () => cierraEnvio(false);

/* ── generación del caso ─────────────────────────────────────────────────────────────── */
const PROMPT_CASO = `Generas casos clínicos para simulación de anamnesis. El paciente es FICTICIO: inventa nombre, edad y circunstancias verosímiles; no uses personas reales.
Devuelve SOLO este JSON, sin markdown:
{"paciente":{"nombre":"nombre y apellido","edad":número,"sexo":"hombre|mujer","ocupacion":"profesión","avatar":"un emoji de persona"},
"motivo_consulta_visible":"una frase en primera persona, en lenguaje llano",
"diagnostico_oculto":"diagnóstico preciso que el estudiante debe deducir",
"historia_completa":{"enfermedad_actual":"inicio, carácter, localización, cronología, factores que mejoran y empeoran","antecedentes_personales":"enfermedades y cirugías previas","antecedentes_familiares":"patología familiar relevante","medicacion":"fármacos y alergias","habitos":"tabaco, alcohol, ejercicio, dieta","contexto_psicosocial":"trabajo, convivencia, estrés"},
"pistas_a_soltar":["dato que el paciente ofrece solo si le preguntan en abierto","otro","otro"],
"perfil_personalidad":"cómo se comporta en la entrevista (locuaz, reservado, ansioso…)"}`;
const contextoCaso = () => `Especialidad: ${S.sp}. Dificultad: ${S.df} (básico: síntomas claros; intermedio: algún distractor; avanzado: presentación atípica).
${INSTR_IDIOMA()}`;

$('btnGenera').onclick = async () => {
  if (ocupado) return;
  if (!pideClave()) return;
  const muestra = PROMPT_CASO + '\n\n' + contextoCaso();
  if (!(await pideEnvio(muestra, 0))) return;
  ocupado = true; $('btnGenera').disabled = true;
  abreGen(['Generando un paciente con su historia clínica oculta', 'Preparando la consulta']);
  $('estadoGen').innerHTML = '<span class="spin"></span> ' + esc(t('Generando el caso…'));
  try {
    const raw = await llmJSON([{role: 'system', content: PROMPT_CASO}, {role: 'user', content: contextoCaso()}], {max: 1600});
    const caso = normalizaCaso(raw);
    if (!caso) throw new Error(t('La IA no devolvió un caso con el formato esperado. Inténtalo de nuevo.'));
    pasosGen(['Generando un paciente con su historia clínica oculta', 'Preparando la consulta'], 1);
    S.caso = caso; S.his = []; S.turns = 0; S.cls = {}; S.hyp = ''; S.ev = null; S.avisos = [];
    S.esEjemplo = false; S.t0 = Date.now(); S.elapsed = 0; desdeUltimaPista = 0;
    await guardaYa();
    cierraGen(); go(2);
  } catch (e) {
    cierraGen(); $('estadoGen').textContent = e.message; toast(e.message, 8000);
  } finally { ocupado = false; $('btnGenera').disabled = false; }
};

/* la IA puede responder con las claves en inglés: se aceptan ambas y se normaliza a los nombres de la app */
function normalizaCaso(d) {
  if (!d || typeof d !== 'object') return null;
  const p = d.paciente || d.patient, h = d.historia_completa || d.full_history;
  if (!p || !h) return null;
  const txt = x => String(x ?? '').trim();
  return {
    paciente: {nombre: txt(p.nombre || p.name) || '—', edad: parseInt(p.edad ?? p.age, 10) || 0, sexo: txt(p.sexo || p.sex), ocupacion: txt(p.ocupacion || p.occupation), avatar: txt(p.avatar) || '🧑'},
    motivo_consulta_visible: txt(d.motivo_consulta_visible || d.chief_complaint),
    diagnostico_oculto: txt(d.diagnostico_oculto || d.hidden_diagnosis),
    historia_completa: {
      enfermedad_actual: txt(h.enfermedad_actual || h.hpi), antecedentes_personales: txt(h.antecedentes_personales || h.pmh),
      antecedentes_familiares: txt(h.antecedentes_familiares || h.fh), medicacion: txt(h.medicacion || h.medications),
      habitos: txt(h.habitos || h.habits), contexto_psicosocial: txt(h.contexto_psicosocial || h.psychosocial)
    },
    pistas_a_soltar: (d.pistas_a_soltar || d.hints || []).map(txt).filter(Boolean),
    perfil_personalidad: txt(d.perfil_personalidad || d.personality)
  };
}

/* ── pantalla 2: la entrevista ───────────────────────────────────────────────────────── */
function pintaEntrevista() {
  const c = S.caso;
  if (!c) { $('pacienteCab').innerHTML = `<p class="empty">${esc(t('Aún no hay paciente. Genera uno en el paso anterior.'))}</p>`; $('msgs').innerHTML = ''; return; }
  const p = c.paciente;
  $('pacienteCab').innerHTML = `<span class="an-cara">${esc(p.avatar)}</span><div><b>${esc(p.nombre)}</b><small>${esc(t('{0} años · {1} · consulta de {2}', p.edad, p.ocupacion || p.sexo, t(S.sp)))}</small></div>`;
  $('msgs').innerHTML = '';
  if (!S.his.length) ponSistema(t('Motivo de consulta: «{0}»', c.motivo_consulta_visible));
  S.his.forEach(h => ponMensaje(h.role === 'user' ? 'yo' : 'paciente', h.content));
  $('cardCheck').hidden = S.md === 'examen';
  pintaChecklist(); pintaMarcador();
  $('btnMic').hidden = !(S.stt && (window.SpeechRecognition || window.webkitSpeechRecognition));
  $('estadoChat').textContent = S.ev ? t('Esta entrevista ya está evaluada.') : '';
  arrancaCronometro();
  avatarMuestra();
}
function pintaChecklist() {
  $('checklist').innerHTML = CHECKLIST.map(it => {
    const hecho = S.cls[it.id] === 'hecho';
    return `<li class="${hecho ? 'hecho' : ''}"><span class="an-emoji">${it.i}</span><span>${esc(t('cl.' + it.id))}</span><span class="an-tic">${hecho ? '✓' : ''}</span></li>`;
  }).join('');
}
function pintaMarcador() {
  const seg = segundos();
  const el = $('mTiempo'); el.textContent = mmss(seg).padStart(5, '0');
  el.className = 'an-mn' + (seg > 1500 ? ' alerta' : '');
  $('mTurnos').textContent = S.turns;
  const pct = pctCobertura(S.cls);
  const c = $('mCob'); c.textContent = pct + '%'; c.className = 'an-mn' + (pct >= 75 ? ' bien' : pct >= 40 ? '' : '');
}
const segundos = () => S.t0 ? Math.floor((Date.now() - S.t0) / 1000) : (S.elapsed || 0);
function arrancaCronometro() { clearInterval(cronometro); if (S.t0 && !S.ev) cronometro = setInterval(pintaMarcador, 1000); }
function ponMensaje(quien, texto) {
  const c = S.caso, d = document.createElement('div');
  d.className = 'an-msg ' + quien;
  const rol = quien === 'yo' ? (S.stu ? t('Dr./Dra. {0}', S.stu) : t('Tú')) : c.paciente.nombre;
  const av = quien === 'yo' ? '🩺' : c.paciente.avatar;
  const voz = (quien === 'paciente' && 'speechSynthesis' in window) ? `<button class="an-tts" type="button" data-leer="${esc(texto)}" aria-label="${esc(t('Leer en voz alta'))}">🔊</button>` : '';
  d.innerHTML = `<div class="an-av">${esc(av)}</div><div class="an-burbuja"><span class="an-rol">${esc(rol)}${voz}</span>${esc(texto).replace(/\n/g, '<br>')}</div>`;
  $('msgs').appendChild(d); abajo();
}
function ponSistema(texto, clase = 'sistema') {
  const d = document.createElement('div'); d.className = 'an-msg ' + clase;
  d.innerHTML = `<div class="an-av">${clase === 'tutor' ? '🎓' : 'ℹ️'}</div><div class="an-burbuja">${esc(texto)}</div>`;
  $('msgs').appendChild(d); abajo();
}
const abajo = () => { const m = $('msgs'); m.scrollTop = m.scrollHeight; };
$('msgs').addEventListener('click', e => { const b = e.target.closest('[data-leer]'); if (b) lee(b.dataset.leer, b); });

const PROMPT_PACIENTE = () => {
  const c = S.caso, h = c.historia_completa;
  return `Eres ${c.paciente.nombre}, paciente de ${c.paciente.edad} años (${c.paciente.sexo}), ${c.paciente.ocupacion}, en una consulta de ${S.sp}. Hablas con el médico que te atiende.
PRIVADO (no lo reveles de golpe): Enfermedad actual: ${h.enfermedad_actual} | Antecedentes personales: ${h.antecedentes_personales} | Antecedentes familiares: ${h.antecedentes_familiares} | Medicación y alergias: ${h.medicacion} | Hábitos: ${h.habitos} | Contexto psicosocial: ${h.contexto_psicosocial}
PISTAS que puedes ofrecer si te preguntan en abierto: ${(c.pistas_a_soltar || []).join(' | ')}
PERSONALIDAD: ${c.perfil_personalidad}
REGLAS: responde solo a lo que te preguntan explícitamente; nunca enumeres toda tu historia. Lenguaje llano de paciente, sin términos médicos ni diagnósticos. Muestra las emociones que correspondan. Máximo 4-5 frases, sin listas. No des nunca el diagnóstico ni lo insinúes.
${INSTR_IDIOMA()}`;
};

async function envia() {
  const inp = $('cin'), txt = inp.value.trim();
  if (!txt || ocupado || !S.caso) return;
  if (S.ev) return toast(t('Esta entrevista ya está evaluada.'));
  if (!pideClave()) return;
  const {t: limpio, n} = scrub(txt, S.stu);
  if (!(await pideEnvio(limpio, n))) return;
  inp.value = ''; inp.style.height = 'auto';
  S.his.push({role: 'user', content: limpio}); S.turns++; desdeUltimaPista++;
  ponMensaje('yo', limpio); pintaMarcador(); guarda();
  ocupado = true; $('btnSend').disabled = true;
  const esperando = document.createElement('div');
  esperando.className = 'an-msg paciente'; esperando.id = 'anEsperando';
  esperando.innerHTML = `<div class="an-av">${esc(S.caso.paciente.avatar)}</div><div class="an-burbuja"><span class="an-puntos"><span></span><span></span><span></span></span></div>`;
  $('msgs').appendChild(esperando); abajo();
  try {
    const r = await llm([{role: 'system', content: PROMPT_PACIENTE()}, ...S.his], {max: 420});
    S.his.push({role: 'assistant', content: r});
    detectaCobertura(r, LANG).forEach(id => { S.cls[id] = 'hecho'; });
    await guardaYa();
    $('anEsperando')?.remove();
    ponMensaje('paciente', r); pintaChecklist(); pintaMarcador();
    if (S.tts) lee(r);
    if (S.md === 'tutor' && desdeUltimaPista >= 5) { desdeUltimaPista = 0; pistaTutor(); }
  } catch (e) {
    $('anEsperando')?.remove();
    S.his.pop(); S.turns--; inp.value = txt; pintaMarcador();
    toast(e.message, 8000);
  } finally { ocupado = false; $('btnSend').disabled = false; }
}
$('btnSend').onclick = envia;
$('cin').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envia(); } });
$('cin').addEventListener('input', e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; });

async function pistaTutor() {
  const faltan = CHECKLIST.filter(it => S.cls[it.id] !== 'hecho').map(it => t('cl.' + it.id));
  if (!faltan.length) return;
  try {
    const h = await llm([{role: 'system', content: `Eres un tutor de medicina, amable y breve. El estudiante aún no ha explorado: ${faltan.join(', ')}. Dale una pista motivadora de 1-2 frases sin decirle literalmente qué preguntar. ${INSTR_IDIOMA()}`}, {role: 'user', content: 'pista'}], {max: 140});
    ponSistema(h, 'tutor'); await guardaYa();
  } catch (e) { /* una pista fallida no interrumpe la entrevista */ }
}

/* ── cierre de la entrevista ─────────────────────────────────────────────────────────── */
$('btnFin').onclick = () => {
  if (!S.caso) return toast(t('Aún no hay paciente.'));
  if (S.ev) return go(3);
  if (S.turns < 3) return toast(t('Haz al menos tres preguntas antes de terminar.'));
  $('mFin').classList.add('on');
};
$('btnHipo').onclick = () => { $('mFin').classList.remove('on'); $('hipoIn').value = S.hyp; $('mHipo').classList.add('on'); $('hipoIn').focus(); };
$('btnSinHipo').onclick = () => { $('mFin').classList.remove('on'); S.hyp = ''; evalua(); };
$('btnHipoOk').onclick = () => { const v = $('hipoIn').value.trim(); if (!v) return toast(t('Escribe tu sospecha diagnóstica o vuelve y termina sin hipótesis.')); S.hyp = v; $('mHipo').classList.remove('on'); evalua(); };

const PROMPT_EVAL = 'Eres evaluador experto en educación médica. Respondes SOLO con JSON válido, sin markdown.';
function mensajeEval() {
  const c = S.caso, h = c.historia_completa;
  const conv = S.his.map((m, i) => `[${m.role === 'user' ? 'MÉDICO' : 'PACIENTE'}] ${m.content}`).join('\n\n');
  return `Evalúa esta anamnesis de ${S.sp} (dificultad ${S.df}).
HISTORIA REAL (el estudiante no la ha visto): Diagnóstico: ${c.diagnostico_oculto} | Enfermedad actual: ${h.enfermedad_actual} | Antecedentes personales: ${h.antecedentes_personales} | Antecedentes familiares: ${h.antecedentes_familiares} | Medicación: ${h.medicacion} | Hábitos: ${h.habitos} | Psicosocial: ${h.contexto_psicosocial}
HIPÓTESIS DEL ESTUDIANTE: "${S.hyp || 'no declarada'}"
ENTREVISTA (${S.turns} preguntas, ${mmss(segundos())}):
${conv}

El campo "turno" de las anotaciones numera las preguntas del médico empezando en 1 (hay ${S.turns}).
Los máximos de "puntos" son fijos: motivo 15, ea 20, ap 15, af 10, medicacion 10, habitos 10, psicosocial 10, revSistemas 10. "puntuacion_global" va de 0 a 10 y cada competencia de 0 a 10.
Devuelve SOLO este JSON:
{"puntuacion_global":0.0,"calificacion":"Insuficiente|Suficiente|Notable|Excelente","puntuacion_checklist":0,
"checklist":{"motivo":{"estado":"completo|parcial|no_explorado","puntos":0,"max":15,"observacion":""},"ea":{"estado":"","puntos":0,"max":20,"observacion":""},"ap":{"estado":"","puntos":0,"max":15,"observacion":""},"af":{"estado":"","puntos":0,"max":10,"observacion":""},"medicacion":{"estado":"","puntos":0,"max":10,"observacion":""},"habitos":{"estado":"","puntos":0,"max":10,"observacion":""},"psicosocial":{"estado":"","puntos":0,"max":10,"observacion":""},"revSistemas":{"estado":"","puntos":0,"max":10,"observacion":""}},
"rubrica":[{"dimension":"","icono":"emoji","nivel":0,"descripcion_nivel":["","","",""],"feedback":""}],
"competencias":{"exploracion":{"puntuacion":0,"comentario":""},"comunicacion":{"puntuacion":0,"comentario":""},"orden":{"puntuacion":0,"comentario":""},"empatia":{"puntuacion":0,"comentario":""},"orientacion":{"puntuacion":0,"comentario":""},"eficiencia":{"puntuacion":0,"comentario":""}},
"anotaciones_transcripcion":[{"turno":1,"tipo":"abierta|cerrada|compuesta|directiva|buena_practica|oportunidad_perdida","etiqueta":"","comentario":""}],
"resumen":"","fortalezas":["","",""],"areas_mejora":["","",""],
"hipotesis_valoracion":{"coincide":"correcto|parcial|incorrecto","comentario":""},
"recomendaciones_aprendizaje":["","",""]}
${INSTR_IDIOMA()}`;
}

async function evalua() {
  if (ocupado) return;
  if (!pideClave()) return;
  clearInterval(cronometro);
  S.elapsed = segundos(); S.t0 = null;
  ocupado = true;
  abreGen(['Analizando la entrevista', 'Aplicando la rúbrica', 'Comprobando las cuentas']);
  try {
    const raw = await llmJSON([{role: 'system', content: PROMPT_EVAL}, {role: 'user', content: mensajeEval()}], {max: 3000});
    pasosGen(['Analizando la entrevista', 'Aplicando la rúbrica', 'Comprobando las cuentas'], 2);
    const {ev, avisos} = revisaEval(raw);
    S.ev = ev; S.avisos = avisos.concat(anotacionesFuera(ev, S.turns).map(a => ({tipo: 'turno', campo: String(a.turno)})));
    S.sesiones = [{
      fecha: new Date().toISOString(), especialidad: S.sp, dificultad: S.df, modo: S.md, lang: LANG,
      paciente: S.caso.paciente.nombre, avatar: S.caso.paciente.avatar, puntuacion: ev.puntuacion_global,
      calificacion: ev.calificacion, checklist: ev.puntuacion_checklist, competencias: ev.competencias,
      turns: S.turns, elapsed: S.elapsed, hipotesis: S.hyp, diagnostico: S.caso.diagnostico_oculto
    }, ...S.sesiones].slice(0, 200);
    await guardaYa();
    cierraGen(); go(3); toast(t('Evaluación lista'));
  } catch (e) { cierraGen(); toast(e.message, 9000); }
  finally { ocupado = false; }
}

/* ── pantalla 3: evaluación ──────────────────────────────────────────────────────────── */
const COLOR_CAL = {Insuficiente: '#C9441F', Suficiente: '#C98200', Notable: '#1F6FB2', Excelente: '#0E7C6B'};
const colorCal = cal => COLOR_CAL[cal] || 'var(--tinta)';
const ICONO_EST = {completo: '✓', parcial: '~', no_explorado: '✗'};

function pintaEval() {
  const ev = S.ev, c = S.caso;
  if (!ev || !c) { $('evalZona').innerHTML = `<div class="card"><p class="empty">${esc(t('Aún no hay evaluación. Termina una entrevista en el paso anterior.'))}</p></div>`; return; }
  const col = colorCal(ev.calificacion);
  const comps = COMPETENCIAS.map(cm => ({...cm, label: t('comp.' + cm.id), v: ev.competencias[cm.id]?.puntuacion || 0, obs: ev.competencias[cm.id]?.comentario || ''}));

  const aviso = S.avisos.length ? `<div class="aviso">${esc(t('El código corrigió {0} dato(s) de la evaluación:', S.avisos.length))} ${esc(S.avisos.map(textoAviso).join(' · '))}</div>` : '';
  const ejemplo = S.esEjemplo ? `<div class="aviso">${esc(t('Caso de demostración ficticio: esta evaluación viene de serie con la app, no la ha generado la IA.'))}</div>` : '';

  $('evalZona').innerHTML = `
  ${ejemplo}
  <div class="card"><div class="an-nota" style="--c:${col}">
    <div><span class="an-cifra">${esc(ev.puntuacion_global.toFixed(1))}</span><small>${esc(t('sobre 10'))}</small></div>
    <div style="flex:1 1 220px"><span class="an-cal">${esc(t('cal.' + ev.calificacion))}</span>
      <small>${esc(t('{0} de 100 puntos de anamnesis · {1} preguntas · {2}', ev.puntuacion_checklist, S.turns, mmss(S.elapsed)))}</small>
      <div class="an-barra"><i style="width:${ev.puntuacion_global * 10}%"></i></div></div>
    <div class="actions" style="margin:0"><button class="btn btn-ghost btn-sm" id="btnHist" type="button">${ico('eye')}<span>${esc(t('Ver la historia oculta'))}</span></button></div>
  </div>
  ${ev.resumen ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.65">${esc(ev.resumen)}</p>` : ''}
  ${aviso}</div>

  <div class="card"><h3 class="an-h3">${esc(t('Competencias'))}</h3><div class="an-dos">
    <div>${radarSVG(comps)}</div>
    <ul class="an-comp">${comps.map(c2 => `<li><b><span>${esc(c2.label)}</span><span style="color:${c2.c}">${esc(c2.v.toFixed(1))}</span></b><div class="an-barra" style="--c:${c2.c}"><i style="width:${c2.v * 10}%"></i></div>${c2.obs ? `<small>${esc(c2.obs)}</small>` : ''}</li>`).join('')}</ul>
  </div></div>

  <div class="card"><h3 class="an-h3">${esc(t('Apartados de la anamnesis'))}</h3>
    <ul class="an-ck">${CHECKLIST.map(it => { const d = ev.checklist[it.id]; return `<li class="${d.estado}"><span class="an-est">${ICONO_EST[d.estado]}</span><span><b>${esc(t('cl.' + it.id))}</b>${d.observacion ? `<small>${esc(d.observacion)}</small>` : ''}</span><span class="an-pts">${d.puntos}/${d.max}</span></li>`; }).join('')}</ul></div>

  ${ev.rubrica.length ? `<div class="card"><h3 class="an-h3">${esc(t('Rúbrica'))}</h3>${ev.rubrica.map(r => `<div class="an-rub"><div class="an-rub-h"><span>${esc(r.icono)}</span><span>${esc(r.dimension)}</span><span class="fa-chip" style="margin-left:auto">${esc(t('Nivel {0} de 4', r.nivel + 1))}</span></div>
    <div class="an-niveles">${(r.descripcion_nivel || []).map((d, i) => `<div class="an-nivel ${i === r.nivel ? 'aqui' : ''}">${esc(d)}</div>`).join('')}</div>
    ${r.feedback ? `<p>${esc(r.feedback)}</p>` : ''}</div>`).join('')}</div>` : ''}

  ${S.hyp ? `<div class="card"><h3 class="an-h3">${esc(t('Tu hipótesis'))}</h3><dl class="an-hip">
    <dt>${esc(t('Tu sospecha'))}</dt><dd>${esc(S.hyp)}</dd>
    <dt>${esc(t('Diagnóstico real'))}</dt><dd>${esc(c.diagnostico_oculto)}</dd>
    <dt>${esc(t('Valoración'))}</dt><dd class="an-vd ${ev.hipotesis_valoracion.coincide}">${esc(t('hv.' + ev.hipotesis_valoracion.coincide))}${ev.hipotesis_valoracion.comentario ? ` — <span style="font-weight:400;color:var(--acero)">${esc(ev.hipotesis_valoracion.comentario)}</span>` : ''}</dd></dl></div>` : ''}

  <div class="card"><h3 class="an-h3">${esc(t('Tu entrevista, comentada'))}</h3><div class="an-tr">${transcripcionHTML(ev)}</div></div>

  <div class="card"><div class="an-listas">
    ${lista(t('Fortalezas'), ev.fortalezas)}${lista(t('A mejorar'), ev.areas_mejora)}${lista(t('Para seguir aprendiendo'), ev.recomendaciones_aprendizaje)}
  </div></div>

  <div class="card"><h3 class="an-h3">${esc(t('Llévatelo'))}</h3><div class="actions" style="margin-top:0">
    <button class="btn btn-primary" id="btnInforme" type="button">${ico('doc')}<span>${esc(t('Informe (HTML)'))}</span></button>
    <button class="btn btn-ghost" id="btnJson" type="button">${ico('download')}<span>JSON</span></button>
    <button class="btn btn-ghost" id="btnCopiar" type="button">${ico('copy')}<span>${esc(t('Copiar resumen'))}</span></button>
    <button class="btn btn-ghost" id="btnOtra" type="button">${ico('refresh')}<span>${esc(t('Otra sesión'))}</span></button>
  </div><p class="help">${esc(t('El informe es un fichero HTML que se abre en cualquier navegador y se puede imprimir o guardar como PDF.'))}</p></div>`;

  $('btnHist').onclick = abreHistoria;
  $('btnInforme').onclick = descargaInforme;
  $('btnJson').onclick = descargaJSON;
  $('btnCopiar').onclick = copiaResumen;
  $('btnOtra').onclick = otraSesion;
}
const lista = (titulo, items) => items.length ? `<div><b>${esc(titulo)}</b><ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
function textoAviso(a) {
  if (a.tipo === 'tope') return t('{0}: {1} puntos sobre un máximo de {2}', t('cl.' + a.campo) === 'cl.' + a.campo ? t('comp.' + a.campo) : t('cl.' + a.campo), a.dado, a.max);
  if (a.tipo === 'suma') return t('la suma del checklist no cuadraba ({0} en vez de {1})', a.dado, a.calculado);
  if (a.tipo === 'calificacion') return t('la calificación no correspondía a la puntuación ({0} con un {1})', a.dado, a.puntuacion);
  if (a.tipo === 'turno') return t('una anotación señalaba un turno inexistente (el {0})', a.campo);
  return a.tipo;
}
function transcripcionHTML(ev) {
  const porTurno = {}; (ev.anotaciones_transcripcion || []).forEach(a => { porTurno[a.turno] = a; });
  let nPregunta = 0;
  return S.his.map(m => {
    const mio = m.role === 'user';
    let tag = '';
    if (mio) { nPregunta++; const a = porTurno[nPregunta]; if (a) tag = `<span class="an-tag ${esc(a.tipo)}">${esc(a.etiqueta || t('tipo.' + a.tipo))}${a.comentario ? `<span class="an-tag-c">${esc(a.comentario)}</span>` : ''}</span>`; }
    return `<div class="an-tr-m ${mio ? 'yo' : ''}"><span class="an-rol">${esc(mio ? (S.stu || t('Tú')) : S.caso.paciente.nombre)}</span>${esc(m.content)}${tag}</div>`;
  }).join('');
}
function abreHistoria() {
  const h = S.caso.historia_completa, p = S.caso.paciente;
  const filas = [['Diagnóstico', S.caso.diagnostico_oculto], ['cl.ea', h.enfermedad_actual], ['cl.ap', h.antecedentes_personales], ['cl.af', h.antecedentes_familiares], ['cl.medicacion', h.medicacion], ['cl.habitos', h.habitos], ['cl.psicosocial', h.contexto_psicosocial]];
  $('histZona').innerHTML = `<p class="help" style="margin-top:0">${esc(t('{0}, {1} años. Caso ficticio generado para esta sesión.', p.nombre, p.edad))}</p>
    <dl class="an-hip">${filas.filter(f => f[1]).map(f => `<dt>${esc(t(f[0]))}</dt><dd>${esc(f[1])}</dd>`).join('')}</dl>`;
  $('mHist').classList.add('on');
}
function otraSesion() {
  S.caso = null; S.his = []; S.turns = 0; S.cls = {}; S.hyp = ''; S.ev = null; S.avisos = []; S.esEjemplo = false; S.t0 = null; S.elapsed = 0;
  guarda(); go(1);
}

/* radar de competencias (SVG, sin librerías) */
function radarSVG(comps) {
  const N = comps.length, cx = 150, cy = 145, R = 85, rm = 14;
  const ang = comps.map((_, i) => (2 * Math.PI * i) / N - Math.PI / 2);
  const pt = (r, i) => [cx + r * Math.cos(ang[i]), cy + r * Math.sin(ang[i])];
  const pv = (v, i) => pt(rm + (v / 10) * (R - rm), i);
  const anillos = [2, 4, 6, 8, 10].map(v => `<polygon points="${ang.map((_, i) => pt(rm + (v / 10) * (R - rm), i).join(',')).join(' ')}" fill="none" stroke="var(--linea)" stroke-width="1"/>`).join('');
  const radios = ang.map((_, i) => { const [x, y] = pt(R, i); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--linea)" stroke-width="1"/>`; }).join('');
  const area = comps.map((c, i) => pv(c.v, i).map(n => n.toFixed(1)).join(',')).join(' ');
  const puntos = comps.map((c, i) => { const [x, y] = pv(c.v, i); return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="${c.c}"/>`; }).join('');
  /* el lienzo es más ancho que el polígono: las etiquetas de los lados se salen del círculo y, si no, se cortan */
  const etiquetas = comps.map((c, i) => { const [x, y] = pt(R + 16, i); const a = x < cx - 5 ? 'end' : x > cx + 5 ? 'start' : 'middle'; return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${a}" font-size="15" font-family="var(--texto)" fill="var(--acero)">${esc(c.label)}</text>`; }).join('');
  return `<svg viewBox="-125 -10 550 320" width="100%" height="auto" role="img" aria-label="${esc(t('Radar de competencias'))}" style="max-width:340px">
    <title>${esc(t('Radar de competencias'))}</title><desc>${esc(comps.map(c => `${c.label}: ${c.v}/10`).join('. '))}</desc>
    ${anillos}${radios}<polygon points="${area}" fill="rgba(228,87,46,.18)" stroke="var(--brasa)" stroke-width="2"/>${puntos}${etiquetas}</svg>`;
}

/* ── pantalla 4: progreso ────────────────────────────────────────────────────────────── */
function pintaProgreso() {
  const ses = S.sesiones, r = resumenProgreso(ses);
  if (!r.n) { $('progZona').innerHTML = `<div class="card"><p class="empty">${esc(t('Todavía no has terminado ninguna sesión. Cuando evalúes una entrevista aparecerá aquí.'))}</p></div>`; return; }
  const comps = COMPETENCIAS.map(c => ({...c, label: t('comp.' + c.id), v: r.competencias[c.id] || 0, obs: ''}));
  $('progZona').innerHTML = `
  <div class="card an-stats">
    <div class="an-m"><span class="an-mn">${r.n}</span><small>${esc(t('sesiones'))}</small></div>
    <div class="an-m"><span class="an-mn">${esc(r.media.toFixed(1))}</span><small>${esc(t('media'))}</small></div>
    <div class="an-m"><span class="an-mn">${esc(r.mejor.toFixed(1))}</span><small>${esc(t('mejor'))}</small></div>
    <div class="an-m"><span class="an-mn">${r.minutos}</span><small>${esc(t('minutos'))}</small></div>
  </div>
  <div class="card"><h3 class="an-h3">${esc(t('Evolución'))}</h3>${evolucionSVG(ses)}</div>
  <div class="card"><h3 class="an-h3">${esc(t('Media por competencia'))}</h3><div class="an-dos"><div>${radarSVG(comps)}</div>
    <ul class="an-comp">${comps.map(c => `<li><b><span>${esc(c.label)}</span><span style="color:${c.c}">${esc(c.v.toFixed(1))}</span></b><div class="an-barra" style="--c:${c.c}"><i style="width:${c.v * 10}%"></i></div></li>`).join('')}</ul></div></div>
  <div class="card"><h3 class="an-h3">${esc(t('Tus sesiones'))}</h3>
    <ul class="an-sesiones">${ses.slice(0, 30).map(s => `<li><span class="an-emoji">${esc(s.avatar || '🧑')}</span><span><b>${esc(t(s.especialidad))}</b><small>${esc(new Date(s.fecha).toLocaleDateString(locale(), {day: 'numeric', month: 'short', year: 'numeric'}))} · ${esc(t('modo.' + s.modo))} · ${esc(t('dif.' + s.dificultad))} · ${esc(mmss(s.elapsed || 0))}</small></span><span class="an-pts" style="color:${colorCal(s.calificacion)}">${esc((s.puntuacion || 0).toFixed(1))}</span></li>`).join('')}</ul></div>
  <div class="card"><div class="actions" style="margin-top:0">
    <button class="btn btn-ghost" id="btnProgCsv" type="button">${ico('download')}<span>${esc(t('Descargar mis sesiones (JSON)'))}</span></button>
    <button class="btn btn-ghost" id="btnProgBorra" type="button">${ico('trash')}<span>${esc(t('Borrar el histórico'))}</span></button>
  </div></div>`;
  $('btnProgCsv').onclick = () => dl('anamnesia_progreso.json', JSON.stringify(S.sesiones, null, 2), 'application/json');
  $('btnProgBorra').onclick = async () => { if (!confirm(t('¿Borrar todas tus sesiones guardadas? No se puede deshacer.'))) return; S.sesiones = []; await guardaYa(); pintaProgreso(); toast(t('Histórico borrado')); };
}
function evolucionSVG(ses) {
  const datos = [...ses].reverse().slice(-20).map(s => s.puntuacion || 0);
  if (datos.length < 2) return `<p class="empty">${esc(t('Con dos sesiones o más verás aquí tu evolución.'))}</p>`;
  const W = 600, H = 170, pad = {l: 30, r: 14, t: 14, b: 22};
  const x = i => pad.l + (i / (datos.length - 1)) * (W - pad.l - pad.r);
  const y = v => pad.t + (1 - v / 10) * (H - pad.t - pad.b);
  const guias = [0, 5, 10].map(v => `<line x1="${pad.l}" y1="${y(v)}" x2="${W - pad.r}" y2="${y(v)}" stroke="var(--linea-2)"/><text x="4" y="${y(v) + 4}" font-size="10" fill="var(--gris)" font-family="var(--texto)">${v}</text>`).join('');
  const linea = datos.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const puntos = datos.map((v, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5" fill="var(--brasa)"><title>${v.toFixed(1)}</title></circle>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="auto" role="img" aria-label="${esc(t('Evolución de tus puntuaciones'))}">
    <title>${esc(t('Evolución de tus puntuaciones'))}</title><desc>${esc(datos.map(v => v.toFixed(1)).join(', '))}</desc>
    ${guias}<path d="${linea}" fill="none" stroke="var(--brasa)" stroke-width="2.5" stroke-linejoin="round"/>${puntos}</svg>`;
}

/* ── voz: dictado y lectura (las hace el navegador; el audio no sale del dispositivo) ── */
let reconocedor = null, escuchando = false;
function alternaMicro() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast(t('Este navegador no admite dictado.'));
  window.speechSynthesis?.cancel();
  if (escuchando) { reconocedor?.stop(); return; }
  reconocedor = new SR();
  reconocedor.lang = locale(); reconocedor.continuous = false; reconocedor.interimResults = true;
  reconocedor.onstart = () => { escuchando = true; $('btnMic').classList.add('escuchando'); $('estadoChat').textContent = t('Escuchando…'); };
  reconocedor.onend = () => { escuchando = false; $('btnMic').classList.remove('escuchando'); $('estadoChat').textContent = ''; };
  reconocedor.onerror = () => { escuchando = false; $('btnMic').classList.remove('escuchando'); $('estadoChat').textContent = ''; };
  reconocedor.onresult = ev => {
    const txt = [...ev.results].map(r => r[0].transcript).join('');
    $('cin').value = txt; $('cin').dispatchEvent(new Event('input'));
  };
  reconocedor.start();
}
$('btnMic').onclick = alternaMicro;
/* iOS (Safari y Chrome, que allí es el mismo motor) solo deja hablar al navegador si la PRIMERA locución
   sale de un gesto de la persona. La respuesta del paciente llega tras esperar a la IA, así que sin esto
   el sistema la descarta en silencio. Se «desbloquea» con una locución vacía en el primer toque. */
let vozDesbloqueada = false;
function desbloqueaVoz() {
  if (vozDesbloqueada || !('speechSynthesis' in window)) return;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; window.speechSynthesis.speak(u); vozDesbloqueada = true; } catch (e) {}
}
document.addEventListener('pointerdown', desbloqueaVoz, {once: true});
document.addEventListener('keydown', desbloqueaVoz, {once: true});
/* la lista de voces llega de forma asíncrona: la primera vez puede estar vacía */
if ('speechSynthesis' in window) { try { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); } catch (e) {} }

function lee(texto, boton) {
  if (!('speechSynthesis' in window)) return;
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) { window.speechSynthesis.cancel(); if (boton) { boton.textContent = '🔊'; return; } }
  const u = new SpeechSynthesisUtterance(texto);
  u.lang = locale(); u.rate = 1;
  const base = locale().split('-')[0], voces = window.speechSynthesis.getVoices();
  const v = voces.find(x => x.lang.startsWith(base) && x.localService) || voces.find(x => x.lang.startsWith(base));
  if (v) u.voice = v;
  avatarHabla(u, texto);
  if (boton) { boton.textContent = '⏹'; u.onend = u.onerror = () => { boton.textContent = '🔊'; }; }
  /* iOS necesita un respiro tras cancel() o se queda mudo */
  setTimeout(() => { try { window.speechSynthesis.speak(u); } catch (e) {} }, 60);
}

/* ── exportaciones ───────────────────────────────────────────────────────────────────── */
const nombreFichero = ext => `anamnesia_${norm(S.stu || 'sesion').replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.${ext}`;
function datosExport() {
  return {
    app: 'AnamnesIA', version: '2.0.0', fecha: new Date().toISOString(), idioma: LANG,
    estudiante: S.stu, especialidad: S.sp, dificultad: S.df, modo: S.md, ejemplo: S.esEjemplo,
    proveedor: S.esEjemplo ? null : getProv(), modelo: S.esEjemplo ? null : getMod(),
    paciente: S.caso.paciente, diagnostico_oculto: S.caso.diagnostico_oculto, historia_completa: S.caso.historia_completa,
    hipotesis: S.hyp, turnos: S.turns, duracion_segundos: S.elapsed,
    conversacion: S.his, evaluacion: S.ev, correcciones_del_codigo: S.avisos
  };
}
const descargaJSON = () => dl(nombreFichero('json'), JSON.stringify(datosExport(), null, 2), 'application/json');
function resumenTexto() {
  const ev = S.ev;
  return [`AnamnesIA — ${t(S.sp)} (${t('dif.' + S.df)})`, `${t('Paciente')}: ${S.caso.paciente.nombre}`,
    `${t('Puntuación')}: ${ev.puntuacion_global.toFixed(1)}/10 — ${t('cal.' + ev.calificacion)} · ${ev.puntuacion_checklist}/100`,
    `${t('Hipótesis')}: ${S.hyp || '—'} · ${t('Diagnóstico real')}: ${S.caso.diagnostico_oculto}`,
    '', t('Fortalezas') + ': ' + ev.fortalezas.join('; '), t('A mejorar') + ': ' + ev.areas_mejora.join('; ')].join('\n');
}
async function copiaResumen() {
  try { await navigator.clipboard.writeText(resumenTexto()); toast(t('Resumen copiado')); }
  catch { toast(t('El navegador no permitió copiar. Descarga el informe en su lugar.'), 6000); }
}
/* informe autónomo: un HTML que se abre en cualquier navegador y se imprime o guarda como PDF */
function descargaInforme() {
  const ev = S.ev, c = S.caso, col = colorCal(ev.calificacion);
  const comps = COMPETENCIAS.map(cm => ({...cm, label: t('comp.' + cm.id), v: ev.competencias[cm.id]?.puntuacion || 0, obs: ev.competencias[cm.id]?.comentario || ''}));
  const fecha = new Date().toLocaleDateString(locale(), {year: 'numeric', month: 'long', day: 'numeric'});
  const sec = (tit, cuerpo) => `<section><h2>${esc(tit)}</h2>${cuerpo}</section>`;
  const ul = (items) => `<ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  const html = `<!DOCTYPE html><html lang="${LANG}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AnamnesIA — ${esc(S.stu || t('Sesión'))} — ${esc(c.paciente.nombre)}</title>
<style>body{font:15px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;color:#1a2733;max-width:840px;margin:0 auto;padding:32px 20px}
h1{font-size:25px;margin:0 0 4px}h2{font-size:17px;margin:26px 0 8px;padding-bottom:5px;border-bottom:2px solid #eee}
.cab{color:#667;font-size:13.5px;margin:0 0 18px}.nota{display:flex;gap:18px;align-items:center;background:#f6f8fb;border-radius:12px;padding:16px 18px}
.cifra{font-size:42px;font-weight:800;color:${col};line-height:1}.cal{font-weight:700;color:${col}}
table{border-collapse:collapse;width:100%;font-size:14px;margin-top:6px}td,th{border:1px solid #e5e7eb;padding:7px 10px;text-align:left;vertical-align:top}th{background:#f6f8fb}
.m{padding:8px 11px;border-radius:9px;margin:6px 0;background:#f6f8fb}.m.yo{background:#eaf2fa;border-left:3px solid #1F6FB2}
.rol{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#889;margin-bottom:2px}
.pie{margin-top:30px;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#778}
@media print{body{padding:0}h2{break-after:avoid}}</style></head><body>
<h1>AnamnesIA · ${esc(t('Informe de la entrevista'))}</h1>
<p class="cab">${esc(S.stu || t('Sesión sin nombre'))} · ${esc(fecha)} · ${esc(t(S.sp))} · ${esc(t('dif.' + S.df))} · ${esc(t('modo.' + S.md))}</p>
<div class="nota"><span class="cifra">${esc(ev.puntuacion_global.toFixed(1))}</span><div><span class="cal">${esc(t('cal.' + ev.calificacion))}</span><br>${esc(t('{0} de 100 puntos de anamnesis · {1} preguntas · {2}', ev.puntuacion_checklist, S.turns, mmss(S.elapsed)))}</div></div>
${ev.resumen ? `<p>${esc(ev.resumen)}</p>` : ''}
${sec(t('Paciente'), `<table><tr><th>${esc(t('Paciente'))}</th><td>${esc(c.paciente.nombre)}, ${esc(c.paciente.edad)} ${esc(t('años'))}, ${esc(c.paciente.ocupacion)}</td></tr><tr><th>${esc(t('Motivo de consulta'))}</th><td>${esc(c.motivo_consulta_visible)}</td></tr><tr><th>${esc(t('Tu hipótesis'))}</th><td>${esc(S.hyp || '—')}</td></tr><tr><th>${esc(t('Diagnóstico real'))}</th><td>${esc(c.diagnostico_oculto)}</td></tr>${ev.hipotesis_valoracion.comentario ? `<tr><th>${esc(t('Valoración'))}</th><td>${esc(t('hv.' + ev.hipotesis_valoracion.coincide))} — ${esc(ev.hipotesis_valoracion.comentario)}</td></tr>` : ''}</table>`)}
${sec(t('Competencias'), `${radarSVG(comps).replace('style="max-width:340px"', 'width="440" height="256"').replace(/var\(--linea\)/g, '#e5e7eb').replace(/var\(--brasa\)/g, '#E4572E').replace(/var\(--acero\)/g, '#2E4B6B').replace(/var\(--texto\)/g, 'sans-serif')}<table><tr><th>${esc(t('Competencia'))}</th><th>0-10</th><th>${esc(t('Comentario'))}</th></tr>${comps.map(c2 => `<tr><td>${esc(c2.label)}</td><td>${esc(c2.v.toFixed(1))}</td><td>${esc(c2.obs)}</td></tr>`).join('')}</table>`)}
${sec(t('Apartados de la anamnesis'), `<table><tr><th>${esc(t('Apartado'))}</th><th>${esc(t('Estado'))}</th><th>${esc(t('Puntos'))}</th><th>${esc(t('Observación'))}</th></tr>${CHECKLIST.map(it => { const d = ev.checklist[it.id]; return `<tr><td>${esc(t('cl.' + it.id))}</td><td>${ICONO_EST[d.estado]} ${esc(t('est.' + d.estado))}</td><td>${d.puntos}/${d.max}</td><td>${esc(d.observacion)}</td></tr>`; }).join('')}</table>`)}
${ev.rubrica.length ? sec(t('Rúbrica'), `<table><tr><th>${esc(t('Dimensión'))}</th><th>${esc(t('Nivel'))}</th><th>${esc(t('Comentario'))}</th></tr>${ev.rubrica.map(r => `<tr><td>${esc(r.icono)} ${esc(r.dimension)}</td><td>${r.nivel + 1}/4 — ${esc((r.descripcion_nivel || [])[r.nivel] || '')}</td><td>${esc(r.feedback)}</td></tr>`).join('')}</table>`) : ''}
${sec(t('Tu entrevista, comentada'), S.his.map((m, i) => { const mio = m.role === 'user'; const n = S.his.slice(0, i + 1).filter(x => x.role === 'user').length; const a = mio ? (ev.anotaciones_transcripcion || []).find(x => x.turno === n) : null; return `<div class="m ${mio ? 'yo' : ''}"><span class="rol">${esc(mio ? (S.stu || t('Tú')) : c.paciente.nombre)}</span>${esc(m.content)}${a ? `<br><small><b>${esc(a.etiqueta || t('tipo.' + a.tipo))}</b> — ${esc(a.comentario)}</small>` : ''}</div>`; }).join(''))}
${sec(t('Fortalezas'), ul(ev.fortalezas))}${sec(t('A mejorar'), ul(ev.areas_mejora))}${sec(t('Para seguir aprendiendo'), ul(ev.recomendaciones_aprendizaje))}
${S.avisos.length ? sec(t('Correcciones del código'), ul(S.avisos.map(textoAviso))) : ''}
<p class="pie">${esc(t('Generado con AnamnesIA (Fernando Borrás Rocher, Universidad Miguel Hernández de Elche). Paciente ficticio. La valoración la redacta un modelo de lenguaje y puede contener errores: es orientativa y no sustituye la evaluación del profesorado.'))}</p>
</body></html>`;
  dl(nombreFichero('html'), html, 'text/html;charset=utf-8');
}

/* ── arranque ────────────────────────────────────────────────────────────────────────── */
/* Histórico de la versión 1 (base «AnamnesIA», almacén «sessions»): se importa una vez para no perder el progreso. */
function importaV1() {
  return new Promise(resolve => {
    if (!('indexedDB' in window)) return resolve([]);
    let r; try { r = indexedDB.open('AnamnesIA'); } catch { return resolve([]); }
    r.onerror = () => resolve([]);
    r.onupgradeneeded = e => { try { e.target.transaction.abort(); } catch {} resolve([]); };  // no existía: no la creamos
    r.onsuccess = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('sessions')) { d.close(); return resolve([]); }
      try {
        const q = d.transaction('sessions', 'readonly').objectStore('sessions').getAll();
        q.onsuccess = () => { d.close(); resolve((q.result || []).map(s => ({
          fecha: s.date, especialidad: s.specialty, dificultad: s.difficulty, modo: {practice: 'practica', exam: 'examen', tutor: 'tutor'}[s.mode] || 'practica',
          lang: s.lang, paciente: s.patientName, avatar: s.patientAvatar, puntuacion: s.score, calificacion: s.calificacion,
          checklist: s.checklistScore, competencias: s.competencias, turns: s.turns, elapsed: s.elapsed, hipotesis: s.hypothesis, diagnostico: s.diagnostico, v1: true
        }))); };
        q.onerror = () => { d.close(); resolve([]); };
      } catch { d.close(); resolve([]); }
    };
  });
}

(async () => {
  const guardado = await cargaEstado();
  if (guardado) S = {...S, ...guardado};
  if (!S.migradoV1) {
    const viejas = await importaV1();
    S.migradoV1 = true;
    if (viejas.length) { S.sesiones = [...S.sesiones, ...viejas].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 200); guarda(); }
  }
  iniciaUI();
  if (S.esEjemplo) aplicaEjemplo();
  go(0);
})();
