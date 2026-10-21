"""Prueba de concepto de OCR por rejilla sobre el escaneo de Calox (página 1).

Requisitos: poppler-utils (pdftoppm), tesseract con spa.traineddata, python3 con opencv-python y numpy.
Uso: python3 ocr_spike.py presupuesto-escaneado.pdf
Resultado obtenido: todas las filas y montos de la tabla correctos; filas de ancho completo
(fecha, encabezados de sección) cortadas por columnas -> leerlas a lo ancho en la implementación.
Coordenadas de la región de la tabla (Y0, Y1) fijadas a mano para esta página: en la
implementación deben detectarse a partir del encabezado de la tabla.
"""
import cv2, numpy as np, subprocess, sys

PDF = sys.argv[1]
subprocess.run(["pdftoppm", "-f", "1", "-l", "1", "-r", "300", "-gray", PDF, "p"], check=True)
img = cv2.imread("p-1.pgm", 0)
H, W = img.shape

bw = cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 25, 10)
inv = 255 - bw
hk = cv2.morphologyEx(inv, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (60, 1)))
vk = cv2.morphologyEx(inv, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_RECT, (1, 30)))

def groups(idx, gap=10):
    out = []
    for i in idx:
        if not out or i - out[-1][-1] > gap:
            out.append([i])
        else:
            out[-1].append(i)
    return [int(np.mean(g)) for g in out]

Y0, Y1 = 1080, 2150
ys = [y + Y0 for y in groups(np.where(hk[Y0:Y1].sum(1) / 255 > W * 0.08)[0])]
xs = groups(np.where(vk[Y0:Y1].sum(0) / 255 > (Y1 - Y0) * 0.25)[0])
print("filas:", ys)
print("columnas:", xs)

def ocr(crop, psm, whitelist=None):
    crop = cv2.copyMakeBorder(crop, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=255)
    crop = cv2.resize(crop, None, fx=1.5, fy=1.5, interpolation=cv2.INTER_CUBIC)
    _, crop = cv2.threshold(crop, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    cv2.imwrite("/tmp/cell.png", crop)
    cmd = ["tesseract", "/tmp/cell.png", "-", "-l", "spa", "--psm", str(psm)]
    if whitelist:
        cmd += ["-c", "tessedit_char_whitelist=" + whitelist]
    return subprocess.run(cmd, capture_output=True, text=True).stdout.strip().replace("\n", " / ")

NUMERIC = {0, 2, 4, 5}  # Cantidad, Día, Tarifa, Total
for top, bottom in zip(ys, ys[1:]):
    if bottom - top < 25:
        continue
    row = []
    for i, (left, right) in enumerate(zip(xs, xs[1:])):
        cell = img[top + 5:bottom - 5, left + 6:right - 6]
        row.append(ocr(cell, 7, "0123456789.,") if i in NUMERIC else ocr(cell, 6))
    print(top, bottom, row)
