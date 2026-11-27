import {dataset,item,field,controls,map,svgNode,rankedTable,fmt,source,readout} from '../../data/geografia/figuras.js';

export async function render(container) {
  const [geo,data] = await Promise.all([dataset(new URL('../../data/geografia/distritos.json',import.meta.url)),dataset(new URL('./distritos-densidade.json',import.meta.url))]);
  item(container,'h3','Onde São Paulo se adensa?');
  item(container,'p','Escolha um limite de densidade. As áreas acima dele aparecem em verde. A visão por distrito usa a média de habitantes por km² em cada um dos 96 distritos.');
  const choices=[['2010','Censo 2010 · distritos'],['2022','Censo 2022 · distritos']];
  const bar=controls(container);
  const mode=field(bar,'Recorte',choices,'2010');
  const label=item(bar,'label','Densidade mínima ');
  const slider=item(label,'input');
  slider.type='range'; slider.min='0'; slider.max='30000'; slider.step='500'; slider.value='10000';
  const output=item(label,'output');
  const svg=map(container,'Distritos acima da densidade selecionada');
  const districtPaths=geo.districts.map(d=>{
    const path=svgNode(svg,'path',{d:d.path,'fill-rule':'evenodd'});
    const title=svgNode(path,'title');
    return {path,title,row:data.values[d.id]};
  });
  const status=readout(container);
  const table=rankedTable(container,['Distrito','Habitantes/km²']);
  const links=controls(container);
  source(links,'Densidades · IBGE e Infocidade',data.source);
  source(links,'Limites distritais · GeoSampa',geo.source);
  function draw() {
    const cutoff=Number(slider.value), key='density'+mode.value;
    output.textContent=fmt(cutoff)+' hab./km²';
    for (const {row,path,title} of districtPaths) {
      const active=row[key]>=cutoff;
      path.setAttribute('fill',active?'#185748':'#e0e6e1');
      title.textContent=row.name+' · '+fmt(row[key])+' hab./km²';
    }
    const rows=Object.values(data.values).sort((a,b)=>b[key]-a[key]);
    const active=rows.filter(r=>r[key]>=cutoff);
    status.textContent=active.length+' de '+rows.length+' distritos com pelo menos '+fmt(cutoff)+' hab./km². Maior densidade: '+rows[0].name+' ('+fmt(rows[0][key])+').';
    table(rows.map(d=>[d.name,fmt(d[key])]));
  }
  slider.addEventListener('input',draw);mode.addEventListener('change',draw);draw();
}
