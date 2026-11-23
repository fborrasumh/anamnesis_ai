# Generador de los avatares de pacientes

Crea los 8 GLB de `avatar/` con Blender (módulo `bpy` 5.3) + MPFB 2.0.18 + el complemento, el rig y los visemas de TalkingHead.

1. `pip install bpy` e instalar MPFB como extensión (zip de `mpfb2/src/mpfb`).
2. `biblioteca.py`: copia a la biblioteca de MPFB solo los recursos de MakeHuman (CC0) que usan los diseños, baja sus texturas (Git LFS) y registra el rig `talkinghead`.
3. `arregla_mhclo.py`: adapta dos rarezas de los `.mhclo` antiguos al lector de MPFB.
4. `genera.py <id>`: crea el paciente, añade los 52 gestos ARKit y los 15 visemas de TalkingHead, quita helpers y exporta a GLB.
5. Comprimir: `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp --texture-size 1024 --simplify false --join false --instance false --palette false --flatten false`.

Los diseños (edad, sexo, piel, pelo, ropa) están en `disenos.py`. Las rutas son las del entorno donde se generaron: ajústalas.
Fuentes: recursos de MakeHuman (copia en github.com/dmaugis/makehuman-py3-assets; los recursos de MakeHuman son CC0), MPFB (GPL, solo como herramienta), TalkingHead (MIT; rig y pesos CC0).
