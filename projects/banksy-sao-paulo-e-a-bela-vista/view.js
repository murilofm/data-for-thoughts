import {dataset,item,field,controls,map,svgNode,rankedTable,fmt,source,readout} from '../../data/geografia/figuras.js';
import { sectorStencil } from './sector-stencil.js';

export async function render(container) {
  const [geo,data,meta,raster]=await Promise.all([
    dataset(new URL('../../data/geografia/distritos.json',import.meta.url)),
    dataset(new URL('distritos-densidade.json',import.meta.url)),
    dataset(new URL('setores-2010.json',import.meta.url)),sectorStencil()
  ]);
  item(container,'h3','Onde São Paulo se adensa?');
  item(container,'p','Movimente o limite para revelar as áreas que atingem a densidade escolhida. Nos setores censitários, pequenas áreas densas aparecem mesmo dentro de distritos com média baixa.');
  const bar=controls(container);
  const mode=field(bar,'Recorte',[['setores','Censo 2010 · setores'],['2010','Censo 2010 · distritos'],['2022','Censo 2022 · distritos']],'setores');
  const label=item(bar,'label','Densidade mínima ');
  const slider=item(label,'input');
  slider.type='range';slider.min='0';slider.max='60000';slider.step='500';slider.value='10000';
  const output=item(label,'output');
  const {canvas,pixels}=raster;
  canvas.style.cssText='display:block;max-width:100%;height:auto;max-height:540px;margin:.75rem auto';
  container.append(canvas);
  const svg=map(container,'Distritos acima da densidade selecionada');
  const paths=geo.districts.map(d=>{
    const path=svgNode(svg,'path',{d:d.path,'fill-rule':'evenodd'});
    const title=svgNode(path,'title');
    return {path,title,row:data.values[d.id]};
  });
  const status=readout(container);
  const tableWrap=item(container,'div');
  const table=rankedTable(tableWrap,['Distrito','Habitantes/km²']);
  const links=controls(container);
  source(links,'População por setor · IBGE',meta.populacao);
  source(links,'Malha 2010 · IBGE',meta.geometrias);
  source(links,'Densidades distritais · Infocidade',data.source);
  function draw() {
    const cutoff=Number(slider.value), sectors=mode.value==='setores';
    output.textContent=fmt(cutoff)+' hab./km²';
    canvas.style.display=sectors?'block':'none';
    svg.style.display=sectors?'none':'block';
    tableWrap.hidden=sectors;
    if(sectors) {
      raster.draw(cutoff);
      status.textContent=fmt(meta.setoresComDado)+' setores com população publicada. '+fmt(meta.setoresSemDado)+' setores sem valor utilizável ficam em branco. Toque no mapa para consultar a densidade de um setor.';
    } else {
      const key='density'+mode.value;
      for(const {row,path,title} of paths) {
        path.setAttribute('fill',row[key]>=cutoff?'#185748':'#e0e6e1');
        title.textContent=row.name+' · '+fmt(row[key])+' hab./km²';
      }
      const rows=Object.values(data.values).sort((a,b)=>b[key]-a[key]);
      const active=rows.filter(r=>r[key]>=cutoff);
      status.textContent=active.length+' de '+rows.length+' distritos no limite selecionado. Maior densidade: '+rows[0].name+' ('+fmt(rows[0][key])+').';
      table(rows.map(d=>[d.name,fmt(d[key])]));
    }
  }
  canvas.addEventListener('click',event=>{
    const box=canvas.getBoundingClientRect();
    const x=Math.floor((event.clientX-box.left)*canvas.width/box.width);
    const y=Math.floor((event.clientY-box.top)*canvas.height/box.height);
    const value=pixels[y*canvas.width+x];
    status.textContent=value>=0?'Setor selecionado · '+fmt(value)+' habitantes por km² em 2010.':'Área sem valor publicado ou fora do município.';
  });
  slider.addEventListener('input',draw);
  mode.addEventListener('change',()=>{
    slider.max=mode.value==='setores'?'60000':'30000';
    if(Number(slider.value)>Number(slider.max)) slider.value=slider.max;
    draw();
  });
  draw();
}
