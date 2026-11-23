"""Corrige dos rarezas de los .mhclo antiguos para el lector de MPFB: líneas de un solo vértice y etiquetas tras «verts 0»."""
import re, pathlib
LIB = pathlib.Path('/root/.config/blender/5.3/extensions/.user/user_default/mpfb/data')
for f in LIB.rglob('*.mhclo'):
    L = f.read_text(errors='ignore').splitlines()
    for i, ln in enumerate(L):
        if ln.startswith('verts '):
            j = i + 1; mov = []
            while j < len(L) and L[j].strip() and not L[j].strip()[0].isdigit(): mov.append(L[j]); j += 1
            if mov: L = L[:i] + mov + [ln] + L[j:]
            break
    f.write_text('\n'.join(L) + '\n')
