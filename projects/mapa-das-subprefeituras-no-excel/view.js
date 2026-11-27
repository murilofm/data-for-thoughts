import {dataset,item,field,controls,map,svgNode,rankedTable,fmt,source,readout} from '../../data/geografia/figuras.js';

export async function render(container) {
  const [geo, housing] = await Promise.all([dataset(new URL('../../data/geografia/distritos.json',import.meta.url)),dataset(new URL('./lancamentos.json',import.meta.url))]);
  item(container,'h3','Quanto valia o metro quadrado lançado?');
  item(container,'p','Lançamentos residenciais verticais por subprefeitura. O valor por m² divide o valor geral de vendas pela área total lançada naquele ano.');
  const bar=controls(container);
  const years=Object.keys(Object.values(housing.values)[0]).reverse();
  const year=field(bar,'Ano',years.map(y=>[y,y]),'2012');
  const metric=field(bar,'Indicador',[['ratio','Valor por m²'],['area','Área lançada'],['sales','Valor geral de vendas']],'ratio');
  const names=Object.keys(housing.values).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const location=field(bar,'Subprefeitura',names.map(n=>[n,n]),'Sé');
  const svg=map(container,'Mapa das subprefeituras de São Paulo');
  const status=readout(container);
  const table=rankedTable(container,['Subprefeitura','R$/m²','Área (m²)','Valor (R$)']);
  const legend=item(container,'p','Tons mais escuros indicam valores mais altos no ano selecionado. Cinza indica ausência de valor na tabela.');
  const links=controls(container);
  source(links,'Área lançada · Infocidade',housing.sources[0]);
  source(links,'Valor geral de vendas · Infocidade',housing.sources[1]);
  source(links,'Baixar a planilha Excel original','https://www.dropbox.com/s/7a0jmixzqywzwi2/SubprefeiturasSAO.xlsm');
  const groups = new Map();
  for (const name of names) {
    const g=svgNode(svg,'g',{'fill-rule':'evenodd'});
    groups.set(name,g);
    g.style.cursor='pointer';
    g.addEventListener('click',()=>{location.value=name;draw()});
  }
  for (const d of geo.districts) {
    svgNode(groups.get(housing.municipalities[d.id]),'path',{d:d.path});
  }
  function draw() {
    const series=names.map(name=>{
      const [area,sales]=housing.values[name][year.value];
      return {name,area,sales,ratio:area>0 && sales!=null ? sales/area : null};
    });
    const key=metric.value;
    const max=Math.max(...series.map(d=>d[key]??0));
    const print=d=>d==null?'—':fmt(d);
    for (const d of series) {
      const g=groups.get(d.name), v=d[key], light=v==null?null:91-62*(v/max);
      g.setAttribute('fill',light===null?'#dededb':'hsl(166 38% '+light+'%)');
      const selected=d.name===location.value;
      g.setAttribute('stroke',selected?'#181d1b':g.getAttribute('fill'));
      g.setAttribute('stroke-width',selected?'1.3':'.15');
      if (selected) {
        svg.append(g);
        status.textContent=d.name+' · '+year.value+' · '+(d.ratio==null?'Sem valor por m² disponível':fmt(d.ratio,2)+' R$/m²')+' · '+print(d.area)+' m² lançados';
      }
    }
    table(series.sort((a,b)=>(b[key]??-1)-(a[key]??-1)).map(d=>[d.name,d.ratio==null?'—':fmt(d.ratio,2),print(d.area),print(d.sales)]));
  }
  for (const el of [metric,year,location]) el.addEventListener('change',draw);
  draw();
}
