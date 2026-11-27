"""Extrai apenas os campos públicos do mapa de janeiro de 2014. Não executa o HTML."""
import argparse
import hashlib
import html
import json
from pathlib import Path
import re
from urllib.request import urlopen

DOWNLOAD='https://drive.usercontent.google.com/download?id=0B1nuI_FiZnnlSlVJZk1DS0VBRnc&export=download&confirm=t&resourcekey=0-vPce_ZiLbAdrejESTT1WWQ'
SOURCE='https://drive.google.com/file/d/0B1nuI_FiZnnlSlVJZk1DS0VBRnc/view?resourcekey=0-vPce_ZiLbAdrejESTT1WWQ'
DIGEST='e952bde11e8f492bdf979a5f742bbdbfaa972c05ecdddbd5a0629f557bbc783e'

def extract(raw):
    if hashlib.sha256(raw).hexdigest()!=DIGEST:
        raise ValueError('A cópia recebida difere da versão arquivada.')
    page=raw.decode('latin-1')
    blocks=re.split(r'new\s+google\.maps\.Marker\(\{',page)[1:]
    segments={}
    for block in blocks:
        coords=re.search(r'position\s*:\s*new\s+google\.maps\.LatLng\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)',block)
        title=re.search(r"""title\s*:\s*["']([^"']+)""",block)
        if not(coords and title): raise ValueError('Marcador incompleto')
        title=html.unescape(title[1])
        state=re.search(r'Rodovia\s*:\s*([A-Z]{2})', title)
        numbers=re.findall(r'\d+(?:[.,]\d+)?',title)
        if not state or len(numbers)!=4:
            raise ValueError(f'Formato inesperado. Valores numéricos: {len(numbers)}')
        road=int(numbers[0])
        rate, km1, km2=[float(n.replace(',','.')) for n in numbers[1:]]
        lat, lon=map(float,coords.groups())
        if not(-35<=lat<=6 and -75<=lon<=-30 and 0<road<1000 and 0<=rate<1000 and 0<=min(km1,km2)<=max(km1,km2)<=4000):
            raise ValueError('Campo fora do intervalo esperado')
        key=(state[1],road,rate,min(km1,km2),max(km1,km2))
        segments.setdefault(key,[]).append([round(lon,6),round(lat,6)])
    if len(blocks)!=552: raise ValueError('Esperados 552 marcadores no arquivo histórico')
    return {'fonte':SOURCE,'sha256':DIGEST,'ano':2012,'marcadores':len(blocks),
            'campos':['uf','br','acidentes_por_km','km_inicial','km_final','extremidades_lon_lat'],
            'trechos':[[*key,points] for key,points in sorted(segments.items())]}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--html',type=Path,help='Cópia local de myMap_f.html')
    parser.add_argument('--out',type=Path,default=Path(__file__).with_name('trechos-2012.json'))
    args=parser.parse_args()
    if args.html: raw=args.html.read_bytes()
    else:
        with urlopen(DOWNLOAD,timeout=90) as response: raw=response.read(700000)
    data=extract(raw)
    args.out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    print(f"{len(data['trechos'])} registros de trechos e {data['marcadores']} marcadores recuperados.")
if __name__=='__main__':
    main()
