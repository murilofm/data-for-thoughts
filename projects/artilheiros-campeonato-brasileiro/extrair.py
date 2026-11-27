"""Re-read the nine-level heat map from its published 2,624 × 2,548 PNG.

Run with Python 3 and Pillow: python projects/artilheiros-campeonato-brasileiro/extrair.py
The player labels and team names are transcribed in dados.json. This script
rebuilds their numerical color levels, leaving the printed labels intact.
"""
import json
from pathlib import Path

from PIL import Image


def main():
    root = Path(__file__).resolve().parent
    path = root / "dados.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    y = [695, 790, 880, 975, 1070, 1210, 1300, 1395, 1490, 1580, 1670,
         1815, 1905, 2000, 2095, 2190]
    x = [1230, 1380, 1540, 1700, 1850, 2010, 2165, 2320, 2475]
    if len(x) != len(data["metrics"]) or len(y) != len(data["observations"]):
        raise ValueError("Layout and player metadata disagree")
    levels = {color: n for n, color in enumerate(data["colors"], start=1)}
    with Image.open(root / data["source"]) as original:
        if original.size != (2624, 2548):
            raise ValueError("The archived figure changed dimensions")
        pixels = original.convert("RGB")
        for row, cy in zip(data["observations"], y):
            values = []
            for cx in x:
                rgb = pixels.getpixel((cx, cy))
                color = "#{:02x}{:02x}{:02x}".format(*rgb)
                values.append(None if color == "#000000" else levels[color])
            row["levels"] = values
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
