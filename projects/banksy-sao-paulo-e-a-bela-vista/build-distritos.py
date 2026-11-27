"""Reproduz as densidades distritais da tabela Infocidade. Execute com Python 3."""
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'data'/'geografia'))
from infocidade import boundaries,normalize,rows
URL='https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/314-03_censo_r5-sub-distr_dens-demo_1970-2022_final_1715873407.htm'

def main():
    ids={normalize(d['name']):d['id'] for d in boundaries()}
    values={}
    for row in rows(URL):
        district=ids.get(normalize(row[0]))
        if district is None or len(row)<8: continue
        try: densities=[round(float(x.replace('.','').replace(',','.'))*100) for x in row[6:8]]
        except ValueError: continue
        values[district]={'name':row[0],'density2010':densities[0],'density2022':densities[1]}
    if len(values)!=96: raise ValueError('Esperados 96 distritos')
    result={'source':URL,'unit':'habitantes/km²','values':values}
    Path(__file__).with_name('distritos-densidade.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
if __name__=='__main__': main()
