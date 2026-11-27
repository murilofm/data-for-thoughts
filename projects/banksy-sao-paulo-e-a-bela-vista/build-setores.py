"""Recria o raster de densidade, em hab./km². Execute com pyshp 2.3, Pillow e pyproj."""
import argparse
import csv
import io
import json
import math
import shutil
import tempfile
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZipFile

import shapefile
from PIL import Image, ImageDraw
from pyproj import Geod

SHP = 'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_de_setores_censitarios__divisoes_intramunicipais/censo_2010/setores_censitarios_shp/sp/sp_setores_censitarios.zip'
CSV = 'https://ftp.ibge.gov.br/Censos/Censo_Demografico_2010/Resultados_do_Universo/Agregados_por_Setores_Censitarios/SP_Capital_20260615.zip'
ROOT = Path(__file__).resolve().parent
GEOD = Geod(ellps='GRS80')
WEST, NORTH, SCALE = -46.85, -23.34, 1400
X_CORRECTION = math.cos(math.radians(-23.55))

def fetch(url, path):
    with urlopen(url, timeout=150) as source, path.open('wb') as dest:
        shutil.copyfileobj(source, dest)
    return path

def census_rows(path):
    with ZipFile(path) as archive:
        member = next(n for n in archive.namelist() if n.lower().endswith('pessoa13_sp1.csv'))
        with archive.open(member) as stream:
            reader = csv.DictReader(io.TextIOWrapper(stream, encoding='latin1'), delimiter=';')
            code_key = next(k for k in reader.fieldnames if 'setor' in k.lower())
            population = {}
            for row in reader:
                value = row['V001'].strip()
                if value.isdigit():
                    population[row[code_key].strip()] = int(value)
    if len(population) < 15000:
        raise ValueError('Tabela populacional incompleta')
    return population

def project(point):
    x,y = point
    return ((x-WEST)*SCALE*X_CORRECTION,(NORTH-y)*SCALE)

def render(shape_zip, population):
    canvas=Image.new('RGB',(645,956))
    known=missing=0
    with ZipFile(shape_zip) as archive, tempfile.TemporaryDirectory() as dest:
        main=next(n for n in archive.namelist() if n.lower().endswith('.shp'))
        stem=Path(main).stem
        for n in archive.namelist():
            path=Path(n)
            if path.stem==stem and path.suffix.lower() in {'.shp','.shx','.dbf'}:
                with archive.open(n) as inp, (Path(dest)/(stem+path.suffix.lower())).open('wb') as out:
                    shutil.copyfileobj(inp,out)
        with shapefile.Reader(str(Path(dest)/(stem+'.shp')),encoding='latin1') as shapes:
            code=next(field[0] for field in shapes.fields[1:] if field[0].upper() in {'CD_GEOCODI','CD_SETOR'})
            for rec in shapes.iterRecords(fields=[code]):
                sector=str(rec[0]).strip()
                if not sector.startswith('3550308'): continue
                if sector not in population:
                    missing+=1
                    continue
                geom=shapes.shape(rec.oid)
                stops=list(geom.parts)+[len(geom.points)]
                rings=[]
                total_area=0
                for start,end in zip(stops,stops[1:]):
                    points=geom.points[start:end]
                    lon,lat=zip(*points)
                    signed=GEOD.polygon_area_perimeter(lon,lat)[0]
                    total_area+=signed
                    rings.append((signed,[project(pt) for pt in points]))
                if total_area==0: raise ValueError('Polígono de área zero')
                density=round(population[sector]*1_000_000/abs(total_area))
                encoded=min(0xFFFFFF,density+1)
                color=(encoded>>16,(encoded>>8)&255,encoded&255)
                mask=Image.new('1',canvas.size)
                pen=ImageDraw.Draw(mask)
                for signed,poly in sorted(rings,key=lambda pair: -abs(pair[0])):
                    pen.polygon(poly,fill=(1 if signed*total_area>0 else 0))
                canvas.paste(color,mask=mask)
                known+=1
    if known<15000: raise ValueError('Menos de 15 mil setores encontrados')
    return canvas, known, missing

def main():
    args=argparse.ArgumentParser()
    args.add_argument('--shape-zip',type=Path)
    args.add_argument('--census-zip',type=Path)
    opts=args.parse_args()
    with tempfile.TemporaryDirectory() as td:
        td=Path(td)
        image, known, missing=render(opts.shape_zip or fetch(SHP,td/'shp.zip'),census_rows(opts.census_zip or fetch(CSV,td/'csv.zip')))
    image.save(ROOT/'setores-2010.png',optimize=True)
    (ROOT/'setores-2010.json').write_text(json.dumps({'geometrias':SHP,'populacao':CSV,'setoresComDado':known,'setoresSemDado':missing,'variavel':'Pessoa13_SP1.V001','unidade':'hab./km²','metodo':'Área geodésica SIRGAS 2000 (GRS80). RGB inteiro menos 1; preto é área sem dados.'},ensure_ascii=False)+'\n')
    print(f'{known} setores com densidade; {missing} sem população publicada.')
if __name__=='__main__':
    main()
