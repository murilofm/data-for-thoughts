"""Digitaliza os traços da figura publicada. Requer Python 3 e Pillow."""
import csv
from datetime import date, timedelta
from math import ceil, floor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "media/98235d58-evolucao1.png"
COLORS = {"aguda": (91,155,213), "subaguda": (237,125,49), "cronica": (165,165,165)}

# Guias visuais em pixels apenas localizam cada curva, excluindo eixos,
# texto e anotações da mesma cor. Cada valor salvo exige um pixel da curva.
GUIDES = {
    "aguda": [
        (36, 556), (44, 345), (53, 133), (62, 177), (70, 175), (86, 255),
        (104, 340), (113, 430), (130, 515),
    ],
    "subaguda": [
        (96, 515), (113, 430), (132, 337), (140, 302), (147, 303), (156, 303),
        (173, 387), (181, 388), (190, 432), (202, 430), (244, 430), (251, 430),
        (259, 388), (270, 388), (438, 388), (447, 388), (456, 345), (464, 302),
        (487, 304), (497, 260), (505, 261), (633, 261), (642, 501), (650, 555),
        (677, 555), (686, 515), (694, 514), (708, 449), (715, 405), (727, 303),
        (737, 430), (744, 471), (753, 515), (761, 434), (771, 305), (780, 303),
        (788, 430), (805, 346), (813, 388), (822, 303), (839, 388), (847, 474),
        (857, 474), (866, 388), (874, 388), (883, 345), (898, 345), (916, 430),
        (925, 429), (934, 473), (994, 473),
    ],
    "cronica": [
        (215, 556), (241, 430), (250, 430), (259, 388), (270, 388), (438, 388),
        (447, 388), (456, 345), (464, 302), (487, 304), (497, 260), (505, 261),
        (633, 261), (642, 501), (650, 555), (677, 555), (686, 515), (694, 514),
        (708, 449), (715, 405), (727, 303), (737, 430), (744, 471), (753, 515),
        (761, 434), (771, 305), (780, 303), (788, 430), (805, 346), (813, 388),
        (822, 303), (839, 388), (847, 474), (857, 474), (866, 388), (874, 388),
        (883, 345), (898, 345), (916, 430), (925, 429), (934, 473), (994, 473),
    ],
}


def sample(image, x, name):
    points = GUIDES[name]
    if x < points[0][0] or x > points[-1][0]:
        return None
    index = next(i for i, (x2, _) in enumerate(points) if x2 >= x)
    x1, y1 = points[max(index - 1, 0)]
    x2, y2 = points[index]
    guide_y = y1 + (y2 - y1) * (x - x1) / (x2 - x1 or 1)
    for dx in (0, -1, 1, -2, 2):
        options = [
            y for y in range(max(125, ceil(guide_y - 28)), min(556, floor(guide_y + 28)) + 1)
            if image.getpixel((x + dx, y)) == COLORS[name]
        ]
        if options:
            center = min(options, key=lambda y: abs(y - guide_y))
            near = [y for y in options if abs(y - center) <= 5]
            return near[len(near) // 2]
    return None


if __name__ == "__main__":
    image = Image.open(SOURCE).convert("RGB")
    if image.size != (1013, 632):
        raise ValueError("As guias foram medidas na imagem de 1013 × 632 pixels")
    with (ROOT / "curvas.csv").open("w", newline="") as handle:
        writer = csv.writer(handle, lineterminator="\n")
        writer.writerow(["data", "x_px", *(key + "_y_px" for key in COLORS)])
        for day in range(115):
            # Primeira e última marcas visíveis do eixo da figura.
            x = floor(19 + 975 * day / 114 + 0.5)
            writer.writerow([date(2016, 4, 30) + timedelta(days=day), x,
                             *(sample(image, x, key) for key in COLORS)])
