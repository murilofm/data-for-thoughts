import {dataset,item,field,controls,map,svgNode,rankedTable,fmt,source,readout} from '../../data/geografia/figuras.js';

export async function render(container) {
  const [geo, housing] = await Promise.all([dataset(new URL('../../data/geografia/distritos.json',import.meta.url)),dataset(new URL('./lancamentos.json',import.meta.url))]);
  item(container,'h3','Quanto valia o metro quadrado lançado?');
  item(container,'p','Lançamentos residenciais verticais por subprefeitura. O valor por m² divide o valor geral de vendas pela área total lançada naquele ano. A série de 2010 reproduz os 26 valores do gráfico original, arredondados para reais inteiros.');
  const bar=controls(container);
  const years=Object.keys(Object.values(housing.values)[0]).reverse();
  const year=field(bar,'Ano',years.map(y=>[y,y]),'2010');
  const metric=field(bar,'Indicador',[['ratio','Valor por m²'],['area','Área lançada'],['sales','Valor geral de vendas']],'ratio');
  const names=Object.keys(housing.values).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const location=field(bar,'Subprefeitura',names.map(n=>[n,n]),'Pinheiros');
  const colorLabel=item(bar,'label','Cor do mapa ');
  const color=item(colorLabel,'input');
  color.type='color';color.value='#084780';
  const customBox=item(container,'details');
  item(customBox,'summary','Usar meus dados');
  item(customBox,'p','Cole uma linha por subprefeitura no formato Nome;Valor. Use vírgula para os decimais. Os seus dados são usados apenas nesta página.');
  const inputLabel=item(customBox,'label','Valores por subprefeitura ');
  const input=item(inputLabel,'textarea');
  input.rows=4;input.placeholder='Sé;12,5\nPinheiros;9';
  const apply=item(customBox,'button','Aplicar série');
  apply.type='button';
  const feedback=readout(customBox);
  const aliases=new Map();
  const norm=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
  for (const name of names) aliases.set(norm(name),name);
  let customValues=new Map();
  apply.addEventListener('click',()=>{
    const next=new Map(), lines=input.value.trim().split(/\r?\n/);
    for(let i=0;i<lines.length;i++) {
      const line=lines[i].trim();
      if(!line) continue;
      const parts=line.split(/;|\t/);
      const name=aliases.get(norm(parts[0]));
      const raw=(parts[1]??'').trim();
      const decimal=raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw;
      const value=Number(decimal);
      if(parts.length!==2||!name||next.has(name)||!raw||!Number.isFinite(value)) {
        feedback.textContent='Revise a linha '+(i+1)+'. Informe uma subprefeitura da tabela uma única vez e um valor numérico.';
        return;
      }
      next.set(name,value);
    }
    if(!next.size) {feedback.textContent='Inclua ao menos uma subprefeitura.';return;}
    customValues=next;
    if(![...metric.options].some(o=>o.value==='custom')) {
      const opt=item(metric,'option','Minha série');
      opt.value='custom';
    }
    metric.value='custom';location.value=next.keys().next().value;
    feedback.textContent=next.size+' valores aplicados.';
    draw();
  });
  const svg=map(container,'Mapa das subprefeituras de São Paulo');
  const status=readout(container);
  const standardTable=item(container,'div');
  const table=rankedTable(standardTable,['Subprefeitura','R$/m²','Área (m²)','Valor (R$)']);
  const customTableWrap=item(container,'div');
  const customTable=rankedTable(customTableWrap,['Subprefeitura','Minha série']);
  item(container,'p','Tons mais escuros indicam valores mais altos no ano selecionado. Cinza indica ausência de valor na tabela.');
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
      return {name,area,sales,custom:customValues.get(name)??null,ratio:area>0 && sales!=null ? sales/area : null};
    });
    const key=metric.value;
    const custom=key==='custom';
    year.disabled=custom;
    const dataValues=series.map(d=>d[key]).filter(v=>v!=null);
    const lo=custom?Math.min(...dataValues):0, hi=Math.max(...dataValues);
    const rgb=[1,3,5].map(start=>parseInt(color.value.slice(start,start+2),16));
    const print=d=>d==null?'—':fmt(d);
    for (const d of series) {
      const g=groups.get(d.name), v=d[key];
      const fraction=hi===lo?1:(v-lo)/(hi-lo);
      const tone=rgb.map(channel=>Math.round(245+(channel-245)*(.14+.86*fraction)));
      g.setAttribute('fill',v==null?'#dededb':'rgb('+tone.join(',')+')');
      const selected=d.name===location.value;
      g.setAttribute('stroke',selected?'#181d1b':g.getAttribute('fill'));
      g.setAttribute('stroke-width',selected?'1.3':'.15');
      if (selected) {
        svg.append(g);
        status.textContent=custom ? d.name+' · Minha série · '+(d.custom==null?'sem valor':fmt(d.custom,4)) : d.name+' · '+year.value+' · '+(d.ratio==null?'Sem valor por m² disponível':fmt(d.ratio,2)+' R$/m²')+' · '+print(d.area)+' m² lançados';
      }
    }
    series.sort((a,b)=>(b[key]??-Infinity)-(a[key]??-Infinity));
    standardTable.hidden=custom;
    customTableWrap.hidden=!custom;
    if(custom) customTable(series.map(d=>[d.name,d.custom==null?'—':fmt(d.custom,4)]));
    else table(series.map(d=>[d.name,d.ratio==null?'—':fmt(d.ratio,2),print(d.area),print(d.sales)]));
  }
  color.addEventListener('input',draw);
  for (const el of [metric,year,location]) el.addEventListener('change',draw);
  draw();
}
