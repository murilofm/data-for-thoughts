"""Read the original Infraero HTML bulletins as inert text. Python 3, no dependencies.

Run on the sample: python extrair.py boletim-2013-11-29-15h.html.txt
Run on a Google Sheets CSV export: python extrair.py Flight-Database.csv
For the 2013 article, include bulletins from Nov 29 through Dec 11 inclusive.
An HTML capture can also be placed in multiple CLI arguments. Output is CSV.
"""
import csv
import json
import re
import sys
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path


class Bulletin(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.date = self.hour = ""
        self.field = self.cell = None
        self.in_grid = False
        self.rows = []
        self.row = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "span" and attrs.get("id") in ("TxtData", "TxtPeriodo"):
            self.field = attrs["id"]
        elif tag == "table" and attrs.get("id") == "GridVoos":
            self.in_grid = True
        elif self.in_grid and tag == "tr":
            self.row = []
        elif self.in_grid and tag == "td":
            self.cell = ""

    def handle_data(self, data):
        if self.field == "TxtData":
            self.date += data
        elif self.field == "TxtPeriodo":
            self.hour += data
        if self.cell is not None:
            self.cell += data

    def handle_endtag(self, tag):
        if tag == "span":
            self.field = None
        elif tag == "td" and self.cell is not None:
            self.row.append(self.cell.strip())
            self.cell = None
        elif tag == "tr" and self.in_grid and self.row:
            if len(self.row) != 5:
                raise ValueError("Expected five columns in airport table")
            self.rows.append(self.row)
        elif tag == "table":
            self.in_grid = False


def sources(path):
    if path.suffix.lower() == ".csv":
        with path.open(encoding="utf-8-sig", newline="") as stream:
            for row in csv.reader(stream):
                if len(row) > 1 and "GridVoos" in row[1]:
                    yield row[1]
    else:
        yield path.read_text(encoding="utf-8-sig")


def decode(html, airports):
    parser = Bulletin()
    parser.feed(html)
    if not parser.rows:
        raise ValueError("The input contains no Infraero bulletin")
    timestamp = datetime.strptime(parser.date.strip() + " " + parser.hour.strip(), "%d/%m/%Y %H:%Mh")
    rows = []
    for name, *values in parser.rows:
        code = "TOTAL" if name == "TOTAIS" else airports[name]
        counts = [int(re.match(r"^(\d+)(?:\s*\(|$)", value)[1]) for value in values]
        rows.append([code, *counts])
    return timestamp.isoformat(timespec="minutes"), rows


if __name__ == "__main__":
    geometry = Path(__file__).resolve().parent.parent / "aeroportos-partidas-e-retornos" / "geografia.json"
    airports = {row["nome"]: row["icao"] for row in json.loads(geometry.read_text())["airports"]}
    captures = {}
    for name in sys.argv[1:]:
        for html in sources(Path(name)):
            bulletin = Bulletin()
            bulletin.feed(html)
            date = datetime.strptime(bulletin.date.strip(), "%d/%m/%Y").date().isoformat()
            if "2013-11-29" <= date <= "2013-12-11":
                timestamp, rows = decode(html, airports)
                captures[timestamp] = rows
    if not captures:
        raise SystemExit("Supply at least one bulletin from the article period")
    out = csv.writer(sys.stdout, lineterminator="\n")
    out.writerow(["horario", "icao", "programados", "atrasados_dia", "atrasados_hora", "cancelados"])
    for timestamp in sorted(captures):
        for row in captures[timestamp]:
            out.writerow([timestamp, *row])
