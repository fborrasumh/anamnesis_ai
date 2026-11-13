#!/usr/bin/env python3
"""Pruebas de AnamnesIA en navegador con IA simulada (sin claves reales).

    cd anamnesia && python3 build.py && python3 tests/smoke_test.py

La IA simulada devuelve a propósito una evaluación con trampas (puntos por encima del tope,
suma mal hecha, calificación que no corresponde y una anotación de un turno inexistente)
para comprobar que el código las caza y las enseña.
"""
import asyncio, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from forja_test import Harness

RAIZ = pathlib.Path(__file__).resolve().parent.parent
INDEX = RAIZ / 'index.html'
CAPTURAS = RAIZ / 'tests' / 'capturas'
CLAVE = 'sk-test-clave-larga-de-prueba-123'

CASO = {
    "paciente": {"nombre": "Lucía Martín", "edad": 34, "sexo": "mujer", "ocupacion": "profesora", "avatar": "👩"},
    "motivo_consulta_visible": "Llevo dos semanas con dolor de cabeza casi todos los días.",
    "diagnostico_oculto": "Cefalea tensional episódica frecuente",
    "historia_completa": {
        "enfermedad_actual": "Dolor opresivo bilateral desde hace dos semanas, empeora por la tarde.",
        "antecedentes_personales": "Migraña en la adolescencia.", "antecedentes_familiares": "Madre con migraña.",
        "medicacion": "Ibuprofeno casi a diario. Sin alergias.", "habitos": "No fuma. Café en exceso.",
        "contexto_psicosocial": "Mucha carga de trabajo este trimestre."},
    "pistas_a_soltar": ["Duerme mal desde que cambió de centro."], "perfil_personalidad": "Colaboradora y detallista."
}
# evaluación con trampas deliberadas
EVAL = {
    "puntuacion_global": 8.8, "calificacion": "Excelente", "puntuacion_checklist": 95,
    "checklist": {k: {"estado": "completo", "puntos": 40 if k == "motivo" else 5, "max": 15, "observacion": "obs " + k}
                  for k in ["motivo", "ea", "ap", "af", "medicacion", "habitos", "psicosocial", "revSistemas"]},
    "rubrica": [{"dimension": "Estructura", "icono": "🎯", "nivel": 7,
                 "descripcion_nivel": ["mal", "regular", "bien", "muy bien"], "feedback": "Buen orden."}],
    "competencias": {k: {"puntuacion": 12 if k == "empatia" else 7, "comentario": "c " + k}
                     for k in ["exploracion", "comunicacion", "orden", "empatia", "orientacion", "eficiencia"]},
    "anotaciones_transcripcion": [{"turno": 1, "tipo": "abierta", "etiqueta": "Abierta", "comentario": "Buena apertura."},
                                  {"turno": 77, "tipo": "cerrada", "etiqueta": "Cerrada", "comentario": "turno que no existe"}],
    "resumen": "Entrevista correcta.", "fortalezas": ["Escucha"], "areas_mejora": ["Hábitos"],
    "hipotesis_valoracion": {"coincide": "correcto", "comentario": "Bien orientada."},
    "recomendaciones_aprendizaje": ["Repasar cefaleas"]
}
RESPUESTA_PACIENTE = ("Pues me empezó hace dos semanas y empeora por la tarde. Tomo ibuprofeno casi a diario "
                      "y duermo mal desde que cambié de centro, con el trabajo que tengo.")

async def responde(prov, system, user, info):
    if 'Generas casos clínicos' in system: return ('j', CASO)
    if 'evaluador experto' in system.lower(): return ('j', EVAL)
    if 'tutor' in system.lower(): return ('t', 'Piensa si has preguntado por la medicación.')
    return ('t', RESPUESTA_PACIENTE)

fallos, hechas = [], 0
def comprueba(nombre, cond, detalle=''):
    global hechas
    hechas += 1
    print(('  ✓ ' if cond else '  ✗ ') + nombre + ('' if cond else '  → ' + detalle))
    if not cond: fallos.append(nombre)

async def pon_clave(h):
    await h.page.evaluate(f"localStorage.setItem('oai_key', '{CLAVE}')")
    await h.page.evaluate("localStorage.setItem(PROV[getProv()].k, '%s')" % CLAVE)

async def acepta_envio(h):
    if await h.page.evaluate("$('mEnvio').classList.contains('on')"):
        await h.page.check('#envioOk'); await h.page.click('#envioSi'); await h.page.wait_for_timeout(200)

async def main():
    CAPTURAS.mkdir(exist_ok=True)
    print('AnamnesIA · pruebas con navegador\n')

    # ── 1. el ejemplo funciona sin clave y sin red ──
    print('Ejemplo sin clave de IA')
    async with Harness(INDEX, responde) as h:
        await h.page.click('#btnEjemplo'); await h.page.wait_for_timeout(500)
        comprueba('abre la evaluación', await h.page.evaluate("step") == 3)
        comprueba('no se ha llamado a ninguna IA', len(h.seen) == 0, str(h.seen))
        comprueba('muestra la puntuación 7.4', '7,4' in await h.page.inner_text('.an-cifra') or '7.4' in await h.page.inner_text('.an-cifra'))
        comprueba('dibuja el radar de competencias', await h.page.evaluate("!!document.querySelector('#evalZona svg polygon')"))
        comprueba('avisa de que el caso es de demostración', 'demostración' in (await h.page.inner_text('#evalZona')).lower())
        comprueba('la transcripción tiene los seis intercambios', await h.page.evaluate("document.querySelectorAll('.an-tr-m').length") == 12)
        comprueba('sin errores de JavaScript', not h.errors, str(h.errors))
        await h.page.screenshot(path=str(CAPTURAS / 'evaluacion.png'), full_page=True)

        # idiomas sobre el ejemplo
        print('\nLos seis idiomas')
        comprueba('no faltan traducciones', await h.page.evaluate("i18nFaltan()") == [])
        for lg, palabra in [('en', 'assessment'), ('ca', 'avaluació'), ('pt', 'avaliação'), ('fr', 'évaluation'), ('de', 'bewertung')]:
            await h.page.select_option('#selLang', lg); await h.page.wait_for_timeout(400)
            txt = await h.page.inner_text('#app')
            comprueba(f'{lg}: la pantalla se repinta', palabra in txt.lower(), txt[:120])
            comprueba(f'{lg}: el ejemplo está en ese idioma', 'Ramón Alcaraz' not in txt or lg == 'es')
        await h.page.select_option('#selLang', 'en'); await h.page.wait_for_timeout(300)
        await h.page.screenshot(path=str(CAPTURAS / 'evaluacion_en.png'), full_page=True)
        await h.page.select_option('#selLang', 'es'); await h.page.wait_for_timeout(300)

    # ── 2. sesión completa con IA simulada ──
    print('\nSesión completa con IA simulada')
    async with Harness(INDEX, responde) as h:
        p = h.page
        await pon_clave(h); await p.reload(); await p.wait_for_timeout(500)
        await p.click('#btnStart'); await p.wait_for_timeout(300)
        await p.fill('#sname', 'Ana García')
        await p.select_option('#spec', 'neurología')
        await p.click('[data-dif="avanzado"]'); await p.click('[data-modo="tutor"]')
        await p.wait_for_timeout(200)
        await p.screenshot(path=str(CAPTURAS / 'preparacion.png'), full_page=True)
        await p.click('#btnGenera'); await p.wait_for_timeout(400)
        comprueba('pide confirmación antes del primer envío', await p.evaluate("$('mEnvio').classList.contains('on')"))
        await acepta_envio(h)
        await h.esp("step===2", n=40)
        comprueba('el caso llega a la entrevista', 'Lucía Martín' in await p.inner_text('#pacienteCab'))
        comprueba('la especialidad viaja a la IA', 'neurología' in h.seen[0]['user'])
        comprueba('se pide el idioma a la IA', 'español' in h.seen[0]['user'])
        comprueba('el diagnóstico oculto no se muestra todavía', 'Cefalea tensional' not in await p.inner_text('#app'))

        for pregunta in ['¿Qué le trae por aquí?', '¿Desde cuándo le ocurre?', '¿Toma alguna medicación?']:
            await p.fill('#cin', pregunta); await p.click('#btnSend'); await p.wait_for_timeout(500)
        await h.esp("S.turns===3", n=40)
        comprueba('tres intercambios registrados', await p.inner_text('#mTurnos') == '3')
        comprueba('el checklist detecta apartados', await p.evaluate("Object.keys(S.cls).length") >= 3,
                   await p.evaluate("JSON.stringify(S.cls)"))
        comprueba('la cobertura ya no es 0%', await p.inner_text('#mCob') != '0%')
        comprueba('el nombre del estudiante no se envía a la IA', not any('Ana García' in s['user'] for s in h.seen))
        await p.screenshot(path=str(CAPTURAS / 'entrevista.png'), full_page=True)

        await p.click('#btnFin'); await p.wait_for_timeout(300)
        await p.click('#btnHipo'); await p.wait_for_timeout(300)
        await p.fill('#hipoIn', 'Cefalea tensional'); await p.click('#btnHipoOk')
        await h.esp("step===3", n=60)
        txt = await p.inner_text('#evalZona')
        comprueba('la evaluación se pinta', 'Cefalea tensional' in txt)
        comprueba('el código corrige y lo dice', 'corrigió' in txt, txt[:200])
        comprueba('recorta el tope del apartado (15, no 40)', await p.evaluate("S.ev.checklist.motivo.puntos") == 15)
        comprueba('rehace la suma del checklist', await p.evaluate("S.ev.puntuacion_checklist") == 50)
        comprueba('corrige la calificación a la escala', await p.evaluate("S.ev.calificacion") == 'Notable')
        comprueba('recorta la competencia fuera de rango', await p.evaluate("S.ev.competencias.empatia.puntuacion") == 10)
        comprueba('detecta la anotación de un turno inexistente', await p.evaluate("S.avisos.some(a=>a.tipo==='turno')"))
        comprueba('la historia oculta ya se puede consultar', await p.evaluate("!!$('btnHist')"))
        await p.click('#btnHist'); await p.wait_for_timeout(300)
        comprueba('la historia oculta muestra el diagnóstico', 'Cefalea tensional' in await p.inner_text('#histZona'))
        await p.click('#mHist [data-close]'); await p.wait_for_timeout(200)

        # descargas
        async with p.expect_download() as d:
            await p.click('#btnJson')
        f = await (await d.value).path()
        datos = json.loads(pathlib.Path(f).read_text(encoding='utf-8'))
        comprueba('el JSON lleva la conversación y la evaluación', len(datos['conversacion']) == 6 and datos['evaluacion']['calificacion'] == 'Notable')
        comprueba('el JSON incluye las correcciones del código', len(datos['correcciones_del_codigo']) >= 3)
        async with p.expect_download() as d:
            await p.click('#btnInforme')
        f2 = await (await d.value).path()
        informe = pathlib.Path(f2).read_text(encoding='utf-8')
        comprueba('el informe HTML es completo', informe.startswith('<!DOCTYPE html') and 'Ana García' in informe and '<svg' in informe)
        comprueba('el informe no depende de la red', 'http://' not in informe and 'https://' not in informe.replace('http://www.w3.org/2000/svg', ''))

        # progreso
        await p.click('#btnProg'); await p.wait_for_timeout(400)
        comprueba('la sesión queda en el progreso', '1' in await p.inner_text('.an-stats'))
        comprueba('sin errores de JavaScript', not h.errors, str(h.errors))
        await p.screenshot(path=str(CAPTURAS / 'progreso.png'), full_page=True)

    # ── 3. modo examen, modelos y errores de la IA ──
    print('\nModo examen, modelos y errores')
    async with Harness(INDEX, responde) as h:
        p = h.page
        listados = []
        for prov in ['openai', 'gemini', 'anthropic']: listados.append(len(await h.modelos(prov)))
        comprueba('los tres proveedores listan modelos', all(n >= 2 for n in listados), str(listados))
        await p.click('#mIA [data-close]'); await p.wait_for_timeout(200)
        await pon_clave(h); await p.reload(); await p.wait_for_timeout(400)
        await p.click('#btnStart'); await p.wait_for_timeout(200)
        await p.click('[data-modo="examen"]'); await p.click('#btnGenera'); await p.wait_for_timeout(300)
        await acepta_envio(h); await h.esp("step===2", n=40)
        comprueba('en examen no se ve el checklist', await p.evaluate("$('cardCheck').hidden"))
        comprueba('no se puede terminar con menos de tres preguntas',
                  (await p.click('#btnFin'), await p.wait_for_timeout(200), not await p.evaluate("$('mFin').classList.contains('on')"))[2])

    async def falla(prov, system, user, info):
        if 'Generas casos clínicos' in system: return ('err', 401, '{"error":{"message":"bad key"}}')
        return ('t', 'ok')
    async with Harness(INDEX, falla) as h:
        p = h.page
        await pon_clave(h); await p.reload(); await p.wait_for_timeout(400)
        await p.click('#btnStart'); await p.wait_for_timeout(200)
        await p.click('#btnGenera'); await p.wait_for_timeout(300)
        await acepta_envio(h); await p.wait_for_timeout(800)
        comprueba('un error de clave se explica y no deja la ventana colgada',
                  not await p.evaluate("$('mGen').classList.contains('on')") and 'clave' in (await p.inner_text('#estadoGen')).lower(),
                  await p.inner_text('#estadoGen'))

    # ── 4. móvil ──
    print('\nMóvil (390×844)')
    async with Harness(INDEX, responde, viewport=(390, 844)) as h:
        p = h.page
        ancho = await p.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        comprueba('la portada no desborda a lo ancho', ancho <= 1, f'sobran {ancho}px')
        await p.click('#btnEjemplo'); await p.wait_for_timeout(600)
        ancho = await p.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        comprueba('la evaluación no desborda a lo ancho', ancho <= 1, f'sobran {ancho}px')
        await p.screenshot(path=str(CAPTURAS / 'movil.png'), full_page=True)

    print(f'\n{hechas} comprobaciones · {len(fallos)} fallo(s)')
    if fallos:
        for f in fallos: print('   ✗', f)
        sys.exit(1)
    print('Capturas en tests/capturas/')

asyncio.run(main())
