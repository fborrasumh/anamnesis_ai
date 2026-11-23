# AnamnesIA

Entrenador de la entrevista clínica con un paciente simulado por IA. Aplicación web de un solo fichero.

**Usar la app:** https://fborrasumh.github.io/anamnesis_ai/

**Idiomas:** español (por defecto), català, inglés, portugués, francés y alemán; selector en la barra superior.

## Qué hace

1. **Genera el caso.** Eliges especialidad (20 disponibles), dificultad (básico, intermedio, avanzado) y modo de estudio. La IA crea un paciente ficticio con una historia clínica completa que tú no ves: diagnóstico, enfermedad actual, antecedentes, medicación, hábitos y contexto psicosocial.
2. **Conduce la entrevista.** Hablas con el paciente por escrito o con dictado. El paciente solo responde a lo que le preguntas, con lenguaje llano y sin insinuar el diagnóstico. Puede responder en voz alta.
3. **Marca la cobertura.** Mientras hablas, el código comprueba qué apartados de la anamnesis aparecen en las respuestas del paciente (motivo, enfermedad actual, antecedentes personales y familiares, medicación, hábitos, contexto psicosocial y revisión por sistemas) y los va marcando.
4. **Cierra con tu hipótesis.** Antes de evaluar, formulas tu sospecha diagnóstica.
5. **Devuelve la evaluación.** Puntuación global sobre 10 y calificación, puntos por apartado sobre 100, seis competencias con gráfico de radar, rúbrica por niveles, la transcripción comentada pregunta a pregunta (abierta, cerrada, compuesta, directiva, buena práctica, oportunidad perdida), valoración de tu hipótesis frente al diagnóstico real y recomendaciones.
6. **Enseña la historia oculta** y guarda la sesión en tu progreso: media, mejor puntuación, minutos, evolución y media por competencia.

**Modos de estudio:** práctica (checklist visible y evaluación completa), examen (sin checklist ni pistas, como una estación OSCE) y tutor (una pista discreta cada cinco intercambios si quedan apartados sin explorar).

**Descargas:** informe HTML autónomo (se abre en cualquier navegador y se imprime o se guarda como PDF), JSON con la sesión entera y copia del resumen al portapapeles.

## Qué hace la IA y qué comprueba el código

La IA interpreta al paciente y redacta la evaluación. El código, por su cuenta:

- Detecta la cobertura de los apartados en lo que responde el paciente, en los seis idiomas. Es una heurística, y la interfaz la llama «indicio»: la revisión apartado por apartado la hace la evaluación final.
- Recorta los puntos de cada apartado a su tope fijo (motivo 15, enfermedad actual 20, antecedentes personales 15, el resto 10).
- Rehace la suma del checklist en lugar de fiarse de la que dé la IA.
- Recorta las competencias al rango 0-10 y el nivel de rúbrica a 0-3.
- Comprueba que la calificación corresponde a la puntuación según la escala de la app, y la corrige si no.
- Detecta anotaciones que señalan turnos que no existen.

Cuando el código corrige algo, lo dice en la propia evaluación y lo incluye en el informe y en el JSON. No se corrige en silencio.

## Cómo se usa la IA

Con la clave propia de OpenAI, Google Gemini o Anthropic Claude, que cada persona pega en el botón «IA». La clave se guarda solo en el navegador y se envía únicamente al proveedor elegido; cada persona paga su propio uso. No hace falta servidor.

El ejemplo de demostración funciona **sin clave y sin red**: es un caso ficticio con su entrevista y su evaluación ya hechas, y pasa por las mismas funciones que una sesión real.

## Privacidad

- Las sesiones, el progreso y los informes se guardan solo en este navegador (IndexedDB).
- Hacia el proveedor de IA salen las preguntas del estudiante y las respuestas del paciente simulado. Antes del primer envío se muestra lo que sale y hay que confirmarlo.
- El nombre del estudiante **no se envía**: solo encabeza los informes locales.
- Los correos, teléfonos y documentos de identidad que aparezcan en lo que se escribe se enmascaran antes de salir.
- El dictado y la voz del paciente los hace el navegador (Web Speech API): el audio no sale del dispositivo.
- Los pacientes son ficticios. **No se deben introducir datos de pacientes reales.**

## Límites

- La valoración la redacta un modelo de lenguaje: es orientativa, puede equivocarse y **no sustituye la evaluación del profesorado**. El código comprueba las cuentas, no el criterio clínico.
- La detección automática de cobertura durante la entrevista funciona por palabras clave: puede marcar de más o de menos. La evaluación final es la que vale.
- No es un sistema de ayuda al diagnóstico ni una herramienta asistencial.
- El dictado y la voz dependen del navegador: funcionan en Chrome y Edge, y no en todos los demás.
- La calidad del caso y de la evaluación dependen del modelo que se use. Un modelo económico basta para practicar.

## Prototipo: avatar 3D del paciente (rama `prototipo-avatar`)

Casilla «Avatar 3D (prototipo)» en el paso 1. En la entrevista aparece el paciente en 3D y mueve los labios cuando habla con la voz del navegador. Sin coste por uso y sin servidor.

- Motor: [TalkingHead](https://github.com/met4citizen/TalkingHead) 1.8.2 (MIT) y three.js 0.186, cargados desde jsDelivr solo si se activa la casilla.
- Avatar: `avatar/paciente.glb`, el ejemplo «mpfb.glb» de TalkingHead (MPFB/MakeHuman, CC0), comprimido de 36 MB a 3 MB (meshopt + WebP).
- Labios: la voz del navegador no deja leer su audio, así que se animan por palabras. Si la voz avisa de cada palabra, palabra a palabra; si no, el texto entero a un ritmo estimado.
- Límites del prototipo: un solo avatar (mujer joven) para todos los casos; los textos nuevos solo están en español; con el avatar activo, jsDelivr recibe la petición de las librerías.

## Novedades de la versión 2.0.0

- Diseño Forja: portada con autoría y ORCID, recorrido por pasos, ayuda y vista móvil.
- Tres proveedores de IA (OpenAI, Gemini, Claude) con el desplegable de modelos que lee la propia clave, en lugar de un único modelo fijo.
- Ejemplo completo que funciona sin clave de API.
- Verificación por código de la evaluación (topes, sumas, calificación y anotaciones) con aviso visible de las correcciones.
- Aviso previo al primer envío y enmascarado de datos personales.
- Detección de cobertura en los seis idiomas (antes solo en español e inglés) y acentuación corregida en català, portugués, francés y alemán.
- El histórico de la versión 1 se importa automáticamente la primera vez que se abre esta.

## Autoría

Fernando Borrás Rocher (Universidad Miguel Hernández de Elche).

ORCID: Fernando Borrás Rocher [0000-0002-5519-4573](https://orcid.org/0000-0002-5519-4573)

## Cómo citar

Borrás Rocher, F. (2026). *AnamnesIA* (v2.0.0) [Software]. https://doi.org/10.5281/zenodo.21423353

## Desarrollo

```bash
python3 build.py                 # monta index.html a partir de app.json + src/ + forja/
node --check all.js              # sintaxis del JavaScript
node tests/nucleo_test.js        # lógica pura: cobertura y verificación de la evaluación
python3 tests/smoke_test.py      # navegador con IA simulada: sesión completa, idiomas, descargas y móvil
```

## Licencia

MIT. Véase [LICENSE](LICENSE).
