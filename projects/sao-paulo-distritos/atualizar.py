"""Recria o CSV da tabela municipal de população, usando apenas a biblioteca padrão."""
import csv
import io
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

SOURCE = "https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/314_01_censo_r5-sub-distr_pop-abs_1950-2022_final_1715805085.htm"
YEARS = [1950, 1960, 1970, 1980, 1991, 2000, 2010, 2022]


class Rows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = []
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th"):
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join("".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row:
            self.rows.append(self.row)


def extract(html):
    parser = Rows()
    parser.feed(html)
    rows, totals, region, sub = [], [], "", ""
    for cells in parser.rows:
        cells = [c for c in cells if c]
        if len(cells) != 9 or not all(re.fullmatch(r"[\d.\s]+", v) for v in cells[1:]):
            continue
        name = cells[0]
        values = [int(re.sub(r"[.\s]", "", v)) for v in cells[1:]]
        if name.startswith("Município"):
            totals = values
        elif name.startswith("Região "):
            region = name.split(" ", 1)[1]
        elif name.startswith("Subprefeitura "):
            sub = name.split(" ", 1)[1]
        elif region and sub:
            rows.append([region, sub, name, *values])
    if len({r[2] for r in rows}) != 96 or len(rows) != 96:
        raise ValueError("A tabela não contém os 96 distritos esperados.")
    if not totals or [sum(r[i] for r in rows) for i in (-2, -1)] != totals[-2:]:
        raise ValueError("Os distritos não somam os totais publicados para 2010 e 2022.")
    return rows


if __name__ == "__main__":
    with urlopen(Request(SOURCE, headers={"User-Agent": "DataForThoughts/1.0"}), timeout=45) as response:
        raw = response.read()
        match = re.search(br"charset\s*=\s*[\"']?([\w-]+)", raw[:5000], re.I)
        encoding = match[1].decode() if match else response.headers.get_content_charset() or "windows-1252"
    rows = extract(raw.decode(encoding))
    out = io.StringIO()
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(["regiao", "subprefeitura", "distrito", *YEARS])
    writer.writerows(rows)
    dest = Path(__file__).with_name("distritos.csv")
    tmp = dest.with_suffix(".tmp")
    tmp.write_text(out.getvalue(), encoding="utf-8")
    os.replace(tmp, dest)
