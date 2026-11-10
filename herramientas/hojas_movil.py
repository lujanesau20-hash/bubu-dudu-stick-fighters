"""Crea versiones para celular (mitad de tamaño) de las hojas de sprites de Bubu y Dudu.
Uso (desde la carpeta del proyecto):  python herramientas/hojas_movil.py
Las originales NO se tocan: las nuevas van a assets/personajes/movil/<personaje>/.
Vuelve a ejecutarlo si cambias alguna hoja original.
"""
import glob
import os
from PIL import Image

FACTOR = 0.5   # debe coincidir con PERSONAJES.movil.factor (config/personajes.js)

tot_o = tot_m = 0
for p in sorted(glob.glob('assets/personajes/bubu/*.png') + glob.glob('assets/personajes/dudu/*.png')):
    p = p.replace(os.sep, '/')
    im = Image.open(p)
    w, h = im.size
    dest = p.replace('assets/personajes/', 'assets/personajes/movil/')
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    im.resize((round(w * FACTOR), round(h * FACTOR)), Image.LANCZOS).save(dest, optimize=True)
    w2, h2 = Image.open(dest).size
    tot_o += w * h * 4
    tot_m += w2 * h2 * 4
    print(f"{os.path.basename(p)}: {w}x{h} {os.path.getsize(p) / 1e6:.2f}MB -> {w2}x{h2} {os.path.getsize(dest) / 1e6:.2f}MB")
print(f"Memoria al decodificar (todas): {tot_o / 1e6:.0f}MB -> {tot_m / 1e6:.0f}MB")
