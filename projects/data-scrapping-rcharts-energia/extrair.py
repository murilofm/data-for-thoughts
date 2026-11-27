"""Extract the data array from Murilo's archived rCharts HTML without running its scripts.

Usage: python extrair.py reservatorios_nivel_energia.html > energia.csv
Original: https://drive.google.com/file/d/0B1nuI_FiZnnlVldzZDBTcDFzZFE/view?resourcekey=0-z1NcGgklegZhpgoIV20KtQ
"""
import csv
import json
import re
import sys
from pathlib import Path

if __name__ == "__main__":
    source = Path(sys.argv[1]).read_text(encoding="utf-8")
    marker = re.search(r'"data"\s*:\s*(?=\[)', source)
    if marker is None:
        raise ValueError("Missing rCharts data array")
    rows, _ = json.JSONDecoder().raw_decode(source[marker.end():])
    dates = [row["date"] for row in rows]
    if not dates or dates != sorted(set(dates)):
        raise ValueError("Expected distinct daily dates in chronological order")
    fields = ["date", "level", "mean", "GWh_term", "GWh_hidro"]
    writer = csv.writer(sys.stdout, lineterminator="\n")
    writer.writerow(fields)
    for row in rows:
        writer.writerow([row[key] for key in fields])
