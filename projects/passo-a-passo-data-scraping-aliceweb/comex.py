"""Recreate the monthly 2000–2013 Comex Stat comparison for the Santos customs unit.

Usage: python comex.py > comex.csv
Use --arquivos to force the official annual CSV files, avoiding API availability.
Empty values mean the source returned no matching records for the month.
"""
import argparse
import csv
import io
import json
import sys
import urllib.request
from collections import defaultdict

NCM = {"12010090", "12019000"}
URF = 817800
YEARS = range(2000, 2014)


def request(url, body=None):
    headers = {"User-Agent": "Data-for-thoughts (historical public-data analysis)", "Accept": "*/*"}
    encoded = None
    if body:
        encoded = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    return urllib.request.urlopen(urllib.request.Request(url, encoded, headers), timeout=120)


def api_series():
    payload = {
        "flow": "export", "monthDetail": True, "period": {"from": "2000-01", "to": "2013-12"},
        "filters": [{"filter": "ncm", "values": sorted(map(int, NCM))}, {"filter": "urf", "values": [URF]}],
        "details": [], "metrics": ["metricFOB", "metricKG"]
    }
    with request("https://api-comexstat.mdic.gov.br/general?language=pt", payload) as response:
        result = json.load(response)
    data = {}
    for row in result["data"]["list"]:
        month = int(row["year"]), int(row["monthNumber"])
        if month in data:
            raise ValueError("Unexpected duplicate month in aggregated query")
        data[month] = (int(row["metricFOB"]), int(row["metricKG"]))
    return data


def bulk_series():
    totals = defaultdict(lambda: [0, 0])
    for year in YEARS:
        url = f"https://balanca.economia.gov.br/balanca/bd/comexstat-bd/ncm/EXP_{year}.csv"
        print(f"Lendo {year}", file=sys.stderr)
        with request(url) as response, io.TextIOWrapper(response, encoding="latin-1", newline="") as stream:
            reader = csv.DictReader(stream, delimiter=";")
            required = {"CO_MES", "CO_URF", "CO_NCM", "KG_LIQUIDO", "VL_FOB"}
            if not required <= set(reader.fieldnames or []):
                raise ValueError(f"Unexpected CSV schema for {year}")
            for row in reader:
                if row["CO_NCM"] in NCM and int(row["CO_URF"] or 0) == URF:
                    bucket = totals[year, int(row["CO_MES"])]
                    bucket[0] += int(row["VL_FOB"])
                    bucket[1] += int(row["KG_LIQUIDO"])
    return totals


def validate(data):
    if not all(any(y == year and pair[0] > 0 and pair[1] > 0 for (y, _), pair in data.items()) for year in YEARS):
        raise ValueError("Expected observations with positive FOB and net weight for each year")
    if any(y not in YEARS or m not in range(1, 13) or min(pair) < 0 for (y, m), pair in data.items()):
        raise ValueError("Invalid year, month, or metric")
    return data


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--arquivos", action="store_true", help="Ler os CSVs anuais da SECEX")
    args = cli.parse_args()
    if args.arquivos:
        data = validate(bulk_series())
    else:
        try:
            data = validate(api_series())
        except (OSError, KeyError, ValueError, TypeError) as reason:
            print(f"API indisponível ({reason}); usando arquivos anuais", file=sys.stderr)
            data = validate(bulk_series())
    out = csv.writer(sys.stdout, lineterminator="\n")
    out.writerow(["mes", "usd_fob", "kg_liquido"])
    for year in YEARS:
        for m in range(1, 13):
            out.writerow([f"{year:04}-{m:02}", *data.get((year, m), ("", ""))])
