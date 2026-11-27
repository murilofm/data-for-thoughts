"""Atualiza a série Infocidade de 1995–2012; exige apenas Python 3."""
from pathlib import Path
import json
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'data'/'geografia'))
from infocidade import boundaries,normalize,rows

AREA='https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/15_area_total_lancada_em_m__dos_lancamentos_1992_2018_1564685414.htm'
VENDAS='https://drive.prefeitura.sp.gov.br/cidade/secretarias/upload/chamadas/15_valor_geral_de_vendas_dos_lancamentos_re_1992_2018_1564686313.htm'
SUBPREFEITURAS=["Aricanduva/Formosa/Carrão","Butantã","Campo Limpo","Capela do Socorro","Casa Verde/Cachoeirinha","Cidade Ademar","Cidade Tiradentes","Ermelino Matarazzo","Freguesia/Brasilândia","Guaianases","Ipiranga","Itaim Paulista","Itaquera","Jabaquara","Jaçanã/Tremembé","Lapa","M'Boi Mirim","Mooca","Parelheiros","Penha","Perus","Pinheiros","Pirituba","Santana/Tucuruvi","Santo Amaro","São Mateus","São Miguel","Sé","Vila Maria/Vila Guilherme","Vila Mariana","Vila Prudente/Sapopemba"]

def collect(url):
    source=rows(url)
    header=next(row for row in source if '1995' in row and '2012' in row)
    indices={year:header.index(str(year)) for year in range(1995,2013)}
    sub_names={normalize(name):name for name in SUBPREFEITURAS}
    district_ids={normalize(d['name']):d['id'] for d in boundaries()}
    current=None
    values={}
    groups={}
    for row in source[source.index(header)+1:]:
        label=normalize(row[0])
        if label in sub_names and sub_names[label] not in values:
            current=sub_names[label]
            values[current]={}
            for year,index in indices.items():
                raw=row[index].replace('.','').strip()
                values[current][year]=int(raw) if raw.isdigit() else None
        elif current and label in district_ids and district_ids[label] not in groups:
            groups[district_ids[label]]=current
        if len(groups)==96 and len(values)==31: break
    if len(values)!=31 or len(groups)!=96: raise ValueError('Geografia incompleta; confira cabeçalhos do Infocidade.')
    return values,groups

def main():
    area,groups=collect(AREA)
    sales,groups_sales=collect(VENDAS)
    if groups!=groups_sales: raise ValueError('Divisões geográficas incompatíveis')
    result={'sources':[AREA,VENDAS],'columns':['Área total lançada (m²)','Valor geral de vendas (R$ correntes)'],
            'municipalities':groups,'values':{n:{y:[area[n][y],sales[n][y]] for y in area[n]} for n in area}}
    Path(__file__).with_name('lancamentos.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
if __name__=='__main__': main()
