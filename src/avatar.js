/* ── avatar 3D del paciente (PROTOTIPO) ────────────────────────────────────────────────────
   Dibuja en el navegador un avatar 3D (TalkingHead, MIT, sobre three.js) y le mueve los labios
   mientras habla la voz del navegador. No usa ningún servicio de pago ni manda audio fuera.
   La voz del navegador no expone el audio, así que los labios se guían por palabras:
   - si la voz avisa de cada palabra (evento «boundary»), se anima palabra a palabra;
   - si no avisa (pasa con algunas voces de Chrome y Safari), se anima el texto entero con un ritmo estimado.
   Avatar: «mpfb.glb» del repositorio de TalkingHead (MPFB/MakeHuman, CC0), comprimido a ~3 MB. */
const AVATAR_LIB = 'https://cdn.jsdelivr.net/npm/@met4citizen/talkinghead@1.8.2/modules/talkinghead.mjs';
const AVATAR_GLB = 'avatar/paciente.glb';
let cabeza = null, cargandoCabeza = null;

async function avatarMuestra() {
  const zona = $('avatarZona');
  zona.hidden = !S.ava;
  if (!S.ava || cabeza || cargandoCabeza) return;
  const lienzo = $('avatarLienzo'), estado = $('avatarEstado');
  estado.textContent = t('Cargando avatar…');
  cargandoCabeza = (async () => {
    const {TalkingHead} = await import(AVATAR_LIB);
    cabeza = new TalkingHead(lienzo, {lipsyncModules: [], cameraView: 'head', avatarMood: 'neutral', modelFPS: 30});
    await cabeza.showAvatar({url: AVATAR_GLB, body: 'F', avatarMood: 'neutral'},
      ev => { if (ev.lengthComputable) estado.textContent = t('Cargando avatar…') + ' ' + Math.round(100 * ev.loaded / ev.total) + '%'; });
    estado.textContent = '';
  })().catch(e => {
    console.error(e); cabeza = null;
    estado.textContent = t('No se pudo cargar el avatar. La entrevista sigue igual sin él.');
  }).finally(() => { cargandoCabeza = null; });
}

/* letras → visemas (Oculus) con las reglas básicas de la ortografía española; sirve de aproximación para los demás idiomas */
function visemasPalabra(w) {
  w = w.toLowerCase().replace(/[^a-záéíóúüñç]/g, '');
  const v = [], voc = {a: 'aa', á: 'aa', e: 'E', é: 'E', i: 'I', í: 'I', y: 'I', o: 'O', ó: 'O', u: 'U', ú: 'U', ü: 'U'};
  for (let i = 0; i < w.length; i++) {
    const c = w[i], s = w[i + 1] || '';
    if (voc[c]) v.push(voc[c]);
    else if (c === 'h') continue;
    else if (c === 'c' && s === 'h') { v.push('CH'); i++; }
    else if ((c === 'q' || c === 'g') && s === 'u' && 'eéií'.includes(w[i + 2] || '')) { v.push('kk'); i++; }
    else if (c === 'l' && s === 'l') { v.push('CH'); i++; }
    else if (c === 'r' && s === 'r') { v.push('RR'); i++; }
    else if ('bpmv'.includes(c)) v.push('PP');
    else if (c === 'f') v.push('FF');
    else if ('dt'.includes(c)) v.push('DD');
    else if ('szç'.includes(c) || (c === 'c' && 'eéií'.includes(s))) v.push('SS');
    else if ('cgkqjx'.includes(c)) v.push('kk');
    else if ('nlñ'.includes(c)) v.push('nn');
    else if (c === 'r') v.push('RR');
  }
  return v;
}

const MS_LETRA = 68;   // ritmo estimado de la voz del navegador a velocidad 1
function avatarVisemas(texto, inicio) {   // encola los visemas de «texto» a partir de «inicio» ms; devuelve cuándo acaba
  let t0 = inicio;
  for (const w of texto.split(/\s+/).filter(Boolean)) {
    const vis = visemasPalabra(w), dur = Math.max(120, w.length * MS_LETRA);
    const d = vis.length ? dur / vis.length : 0;
    vis.forEach((x, j) => {
      const t = t0 + j * d;
      cabeza.animQueue.push({template: {name: 'viseme'}, ts: [t - Math.min(60, 2 * d / 3), t + Math.min(25, d / 2), t + d + Math.min(60, d / 2)],
        vs: {['viseme_' + x]: [null, (x === 'PP' || x === 'FF') ? 0.9 : 0.6, 0]}});
    });
    t0 += dur + (/[.,;:!?]$/.test(w) ? 250 : 40);
  }
  return t0;
}
function avatarCalla() {
  if (!cabeza) return;
  cabeza.animQueue = cabeza.animQueue.filter(x => x.template?.name !== 'viseme');
  cabeza.resetLips(); cabeza.isSpeaking = false; cabeza.stateName = 'idle';
}

/* se engancha a cada locución del paciente (la llama lee() antes de hablar) */
function avatarHabla(u, texto) {
  if (!cabeza) return;
  let porPalabras = false, estimado = false, respaldo = null;
  u.addEventListener('start', () => {
    cabeza.isSpeaking = true; cabeza.stateName = 'speaking';
    cabeza.lookAtCamera(500); cabeza.speakWithHands();
    respaldo = setTimeout(() => { if (!porPalabras) { estimado = true; avatarVisemas(texto, cabeza.animClock); } }, 300);
  });
  u.addEventListener('boundary', ev => {
    if (ev.name && ev.name !== 'word') return;
    porPalabras = true;
    if (estimado) return;   // el respaldo ya animó todo el texto
    const w = texto.slice(ev.charIndex, ev.charLength ? ev.charIndex + ev.charLength : undefined).split(/\s/)[0];
    avatarVisemas(w, cabeza.animClock);
  });
  const fin = () => { clearTimeout(respaldo); avatarCalla(); };
  u.addEventListener('end', fin); u.addEventListener('error', fin);
}
