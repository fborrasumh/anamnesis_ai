/* ══ Datos de AnamnesIA: especialidades, checklist de anamnesis, competencias, pistas de cobertura y el ejemplo sin clave.
      Todo se guarda y se procesa con los identificadores en español (son datos); los textos se traducen al pintar con t(). ══ */

/* Las 20 especialidades. El id es la etiqueta en español y viaja a la IA tal cual; la etiqueta visible es t(id). */
const ESPECIALIDADES = [
  {id: 'medicina general', i: '🏥'}, {id: 'urgencias', i: '🚨'}, {id: 'medicina interna', i: '🔬'},
  {id: 'cardiología', i: '❤️'}, {id: 'neumología', i: '🫁'}, {id: 'neurología', i: '🧠'},
  {id: 'gastroenterología', i: '🫃'}, {id: 'ginecología y obstetricia', i: '👶'}, {id: 'pediatría', i: '🧒'},
  {id: 'psiquiatría', i: '💭'}, {id: 'traumatología', i: '🦴'}, {id: 'dermatología', i: '🌿'},
  {id: 'endocrinología', i: '⚗️'}, {id: 'reumatología', i: '🦵'}, {id: 'nefrología', i: '🫘'},
  {id: 'hematología', i: '🩸'}, {id: 'oncología', i: '🎗️'}, {id: 'infectología', i: '🦠'},
  {id: 'geriatría', i: '👴'}, {id: 'cirugía general', i: '🔪'}
];

/* Checklist de la anamnesis: w = puntos máximos de ese apartado en la rúbrica (suman 100). */
const CHECKLIST = [
  {id: 'motivo', w: 15, i: '🎯'}, {id: 'ea', w: 20, i: '📋'}, {id: 'ap', w: 15, i: '📁'},
  {id: 'af', w: 10, i: '👨‍👩‍👧'}, {id: 'medicacion', w: 10, i: '💊'}, {id: 'habitos', w: 10, i: '🚬'},
  {id: 'psicosocial', w: 10, i: '🏠'}, {id: 'revSistemas', w: 10, i: '🔬'}
];

/* Competencias evaluadas (gráfico de radar). */
const COMPETENCIAS = [
  {id: 'exploracion', c: '#1F6FB2'}, {id: 'comunicacion', c: '#0E8C7A'}, {id: 'orden', c: '#C98200'},
  {id: 'empatia', c: '#E4572E'}, {id: 'orientacion', c: '#6B4FD8'}, {id: 'eficiencia', c: '#8A3617'}
];

const DIFICULTADES = [{id: 'basico', i: '🌱'}, {id: 'intermedio', i: '🔬'}, {id: 'avanzado', i: '⚡'}];
const MODOS = [{id: 'practica', i: '📚'}, {id: 'examen', i: '📝'}, {id: 'tutor', i: '🎓'}];
const CALIFICACIONES = ['Insuficiente', 'Suficiente', 'Notable', 'Excelente'];

/* ── Cobertura verificada por código ──────────────────────────────────────────────────────────
   Marca un apartado como explorado cuando lo que dice el PACIENTE contiene alguna de estas expresiones.
   Es una heurística: por eso la interfaz la llama «indicio» y la evaluación final la revisa la IA apartado por apartado.
   Están los seis idiomas (en la versión anterior solo es/en detectaban cobertura: en los demás el checklist no se movía). */
const COBERTURA = {
  es: {motivo: ['me duele', 'tengo', 'llevo', 'desde hace', 'me pasa', 'noto', 'vengo', 'siento'],
    ea: ['empezó', 'comenzó', 'días', 'semanas', 'meses', 'empeora', 'mejora', 'cuando', 'ayer', 'repente'],
    ap: ['antes tuve', 'he tenido', 'operaron', 'ingresado', 'diagnosticaron', 'de pequeño'],
    af: ['padre', 'madre', 'abuelo', 'familia', 'hermano', 'hermana'],
    medicacion: ['tomo', 'pastillas', 'medicamento', 'alergia', 'recetaron', 'inyección'],
    habitos: ['fumo', 'alcohol', 'bebo', 'deporte', 'ejercicio', 'dieta', 'como'],
    psicosocial: ['trabajo', 'vivo', 'convivo', 'pareja', 'familia', 'estrés', 'preocupa', 'casa'],
    revSistemas: ['orina', 'deposiciones', 'fiebre', 'peso', 'apetito', 'sueño', 'cansancio', 'vista', 'respirar']},
  ca: {motivo: ['em fa mal', 'tinc', 'fa', 'des de fa', 'noto', 'vinc', 'sento'],
    ea: ['va començar', 'dies', 'setmanes', 'mesos', 'empitjora', 'millora', 'quan', 'ahir', 'sobte'],
    ap: ['vaig tenir', 'he tingut', 'em van operar', 'ingressat', 'van diagnosticar', 'de petit'],
    af: ['pare', 'mare', 'avi', 'família', 'germà', 'germana'],
    medicacion: ['prenc', 'pastilles', 'medicament', 'al·lèrgia', 'van receptar', 'injecció'],
    habitos: ['fumo', 'alcohol', 'bec', 'esport', 'exercici', 'dieta', 'menjo'],
    psicosocial: ['treball', 'visc', 'parella', 'família', 'estrès', 'preocupa', 'casa'],
    revSistemas: ['orina', 'deposicions', 'febre', 'pes', 'gana', 'son', 'cansament', 'vista', 'respirar']},
  en: {motivo: ['i have', 'i feel', 'i have been', 'since', 'started', 'experiencing', 'it hurts'],
    ea: ['began', 'started', 'days', 'weeks', 'months', 'worse', 'better', 'when', 'yesterday', 'suddenly'],
    ap: ['i had', 'i have had', 'surgery', 'hospitalised', 'hospitalized', 'diagnosed', 'childhood'],
    af: ['father', 'mother', 'grandfather', 'grandmother', 'family', 'brother', 'sister'],
    medicacion: ['i take', 'pills', 'medication', 'allergy', 'prescribed', 'injection'],
    habitos: ['smoke', 'alcohol', 'drink', 'exercise', 'diet', 'eat'],
    psicosocial: ['work', 'i live', 'partner', 'family', 'stress', 'worried', 'home'],
    revSistemas: ['urine', 'stools', 'fever', 'weight', 'appetite', 'sleep', 'tired', 'vision', 'breathing']},
  pt: {motivo: ['dói', 'tenho', 'há', 'desde há', 'noto', 'venho', 'sinto'],
    ea: ['começou', 'dias', 'semanas', 'meses', 'piora', 'melhora', 'quando', 'ontem', 'de repente'],
    ap: ['tive', 'já tive', 'operaram', 'internado', 'diagnosticaram', 'em pequeno'],
    af: ['pai', 'mãe', 'avô', 'avó', 'família', 'irmão', 'irmã'],
    medicacion: ['tomo', 'comprimidos', 'medicamento', 'alergia', 'receitaram', 'injeção'],
    habitos: ['fumo', 'álcool', 'bebo', 'desporto', 'exercício', 'dieta', 'como'],
    psicosocial: ['trabalho', 'vivo', 'companheiro', 'família', 'stress', 'preocupa', 'casa'],
    revSistemas: ['urina', 'dejeções', 'febre', 'peso', 'apetite', 'sono', 'cansaço', 'visão', 'respirar']},
  fr: {motivo: ['j’ai mal', "j'ai mal", 'j’ai', "j'ai", 'depuis', 'je sens', 'je viens', 'ça me'],
    ea: ['a commencé', 'jours', 'semaines', 'mois', 'empire', 'améliore', 'quand', 'hier', 'soudain'],
    ap: ['j’ai eu', "j'ai eu", 'opéré', 'hospitalisé', 'diagnostiqué', 'enfant'],
    af: ['père', 'mère', 'grand-père', 'grand-mère', 'famille', 'frère', 'sœur'],
    medicacion: ['je prends', 'comprimés', 'médicament', 'allergie', 'prescrit', 'piqûre'],
    habitos: ['je fume', 'alcool', 'je bois', 'sport', 'exercice', 'régime', 'je mange'],
    psicosocial: ['travail', 'je vis', 'conjoint', 'famille', 'stress', 'inquiète', 'maison'],
    revSistemas: ['urine', 'selles', 'fièvre', 'poids', 'appétit', 'sommeil', 'fatigue', 'vue', 'respirer']},
  de: {motivo: ['tut weh', 'ich habe', 'seit', 'ich spüre', 'ich komme', 'schmerzen'],
    ea: ['angefangen', 'begann', 'tage', 'wochen', 'monate', 'schlimmer', 'besser', 'wenn', 'gestern', 'plötzlich'],
    ap: ['ich hatte', 'operiert', 'krankenhaus', 'diagnostiziert', 'als kind'],
    af: ['vater', 'mutter', 'großvater', 'großmutter', 'familie', 'bruder', 'schwester'],
    medicacion: ['ich nehme', 'tabletten', 'medikament', 'allergie', 'verschrieben', 'spritze'],
    habitos: ['rauche', 'alkohol', 'trinke', 'sport', 'bewegung', 'ernährung', 'esse'],
    psicosocial: ['arbeit', 'ich lebe', 'partner', 'familie', 'stress', 'sorgen', 'zuhause'],
    revSistemas: ['urin', 'stuhlgang', 'fieber', 'gewicht', 'appetit', 'schlaf', 'müdigkeit', 'sehen', 'atmen']}
};

/* ── Ejemplo de demostración: funciona SIN clave de IA y sin red ───────────────────────────────
   Es un caso ficticio con su entrevista y su evaluación ya hechas. Pasa por las mismas funciones
   que una sesión real (misma pintura, mismas descargas), para que se vea exactamente lo que se obtiene.
   Los textos se construyen con t() al pintar: así existe en los seis idiomas. */
function ejemploSesion() {
  return {
    caso: {
      paciente: {nombre: t('ej.nombre'), edad: 58, sexo: t('ej.sexo'), ocupacion: t('ej.ocupacion'), avatar: '🧔'},
      motivo_consulta_visible: t('ej.motivo'),
      diagnostico_oculto: t('ej.dx'),
      historia_completa: {
        enfermedad_actual: t('ej.hc.ea'), antecedentes_personales: t('ej.hc.ap'), antecedentes_familiares: t('ej.hc.af'),
        medicacion: t('ej.hc.med'), habitos: t('ej.hc.hab'), contexto_psicosocial: t('ej.hc.ps')
      },
      pistas_a_soltar: [t('ej.pista1'), t('ej.pista2')],
      perfil_personalidad: t('ej.personalidad')
    },
    his: [
      {role: 'user', content: t('ej.t1u')}, {role: 'assistant', content: t('ej.t1p')},
      {role: 'user', content: t('ej.t2u')}, {role: 'assistant', content: t('ej.t2p')},
      {role: 'user', content: t('ej.t3u')}, {role: 'assistant', content: t('ej.t3p')},
      {role: 'user', content: t('ej.t4u')}, {role: 'assistant', content: t('ej.t4p')},
      {role: 'user', content: t('ej.t5u')}, {role: 'assistant', content: t('ej.t5p')},
      {role: 'user', content: t('ej.t6u')}, {role: 'assistant', content: t('ej.t6p')}
    ],
    hyp: t('ej.hipotesis'),
    turns: 6, elapsed: 512,
    ev: {
      puntuacion_global: 7.4, calificacion: 'Notable', puntuacion_checklist: 72,
      checklist: {
        motivo: {estado: 'completo', puntos: 15, max: 15, observacion: t('ej.ck.motivo')},
        ea: {estado: 'completo', puntos: 17, max: 20, observacion: t('ej.ck.ea')},
        ap: {estado: 'parcial', puntos: 9, max: 15, observacion: t('ej.ck.ap')},
        af: {estado: 'completo', puntos: 9, max: 10, observacion: t('ej.ck.af')},
        medicacion: {estado: 'parcial', puntos: 5, max: 10, observacion: t('ej.ck.med')},
        habitos: {estado: 'completo', puntos: 9, max: 10, observacion: t('ej.ck.hab')},
        psicosocial: {estado: 'parcial', puntos: 5, max: 10, observacion: t('ej.ck.ps')},
        revSistemas: {estado: 'no_explorado', puntos: 3, max: 10, observacion: t('ej.ck.rev')}
      },
      rubrica: [
        {dimension: t('ej.r1.dim'), icono: '🎯', nivel: 3, descripcion_nivel: [t('ej.r1.n0'), t('ej.r1.n1'), t('ej.r1.n2'), t('ej.r1.n3')], feedback: t('ej.r1.fb')},
        {dimension: t('ej.r2.dim'), icono: '💬', nivel: 2, descripcion_nivel: [t('ej.r2.n0'), t('ej.r2.n1'), t('ej.r2.n2'), t('ej.r2.n3')], feedback: t('ej.r2.fb')},
        {dimension: t('ej.r3.dim'), icono: '🧭', nivel: 2, descripcion_nivel: [t('ej.r3.n0'), t('ej.r3.n1'), t('ej.r3.n2'), t('ej.r3.n3')], feedback: t('ej.r3.fb')}
      ],
      competencias: {
        exploracion: {puntuacion: 7, comentario: t('ej.c.exploracion')},
        comunicacion: {puntuacion: 8, comentario: t('ej.c.comunicacion')},
        orden: {puntuacion: 8, comentario: t('ej.c.orden')},
        empatia: {puntuacion: 7, comentario: t('ej.c.empatia')},
        orientacion: {puntuacion: 8, comentario: t('ej.c.orientacion')},
        eficiencia: {puntuacion: 6, comentario: t('ej.c.eficiencia')}
      },
      anotaciones_transcripcion: [
        {turno: 1, tipo: 'abierta', etiqueta: t('tipo.abierta'), comentario: t('ej.a1')},
        {turno: 2, tipo: 'buena_practica', etiqueta: t('tipo.buena_practica'), comentario: t('ej.a2')},
        {turno: 4, tipo: 'compuesta', etiqueta: t('tipo.compuesta'), comentario: t('ej.a4')},
        {turno: 6, tipo: 'oportunidad_perdida', etiqueta: t('tipo.oportunidad_perdida'), comentario: t('ej.a6')}
      ],
      resumen: t('ej.resumen'),
      fortalezas: [t('ej.f1'), t('ej.f2'), t('ej.f3')],
      areas_mejora: [t('ej.m1'), t('ej.m2'), t('ej.m3')],
      hipotesis_valoracion: {coincide: 'parcial', comentario: t('ej.hv')},
      recomendaciones_aprendizaje: [t('ej.rec1'), t('ej.rec2'), t('ej.rec3')]
    }
  };
}
