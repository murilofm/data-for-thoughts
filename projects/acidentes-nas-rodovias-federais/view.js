import {dataset,item,field,controls,map,svgNode,rankedTable,fmt,source,readout} from '../../data/geografia/figuras.js';

export async function render(container) {
  const [data, geography]=await Promise.all(['trechos-2012.json','estados.json'].map(name=>dataset(new URL(name,import.meta.url))));
  const records=data.trechos.slice().sort((a,b)=>b[2]-a[2]);
  item(container,'h3','Onde se concentraram os acidentes em 2012?');
  item(container,'p','O mapa original preservou as extremidades dos trechos com mais de 14 acidentes por quilômetro. Selecione um estado ou mova o limite para encontrar os registros com maior concentração.');
  const bar=controls(container);
  const ufs=[...new Set(records.map(d=>d[0]))].sort();
  const state=field(bar,'Estado',[['all','Todos'],...ufs.map(uf=>[uf,uf])],'all');
  const label=item(bar,'label','Acidentes por km · mínimo ');
  const min=item(label,'input');min.type='range';min.min='14';min.max='112';min.step='1';min.value='14';
  const threshold=item(label,'output');
  const svg=map(container,'Extremidades dos trechos rodoviários registrados em 2012','0 0 720 705');
  const backdrop=geography.estados.map(d=>[d.uf,svgNode(svg,'path',{d:d.path,fill:'#e1e9e5',stroke:'#fff','stroke-width':'.8','fill-rule':'evenodd'})]);
  const overlay=svgNode(svg,'g');
  const status=readout(container);
  const table=rankedTable(container,['UF','Rodovia','Trecho (km)','Acidentes/km']);
  item(container,'p','Distância e acidentes por km reproduzem os valores publicados. Os pontos marcam início e fim no Plano Nacional de Viação. Alguns intervalos aparecem com mais de uma taxa no arquivo original. O volume de veículos por trecho não está disponível nesta série.');
  const links=controls(container);
  source(links,'Arquivo do mapa original',data.fonte);
  source(links,'Baixar dados recuperados',new URL('trechos-2012.json',import.meta.url));
  const describe=row=>row[0]+' · BR-'+String(row[1]).padStart(3,'0')+' · km '+fmt(row[3],1)+' a '+fmt(row[4],1)+' · '+fmt(row[2],2)+' acidentes/km';
  function draw() {
    threshold.textContent=fmt(Number(min.value));
    const rows=records.filter(row=>(state.value==='all'||row[0]===state.value)&&row[2]>=Number(min.value));
    overlay.replaceChildren();
    for(const [uf,path] of backdrop) path.setAttribute('fill',state.value==='all'||state.value===uf?'#dce5e0':'#eef1ed');
    for(const row of rows.slice().reverse()) {
      const group=svgNode(overlay,'g',{'aria-label':describe(row)});
      svgNode(group,'title').textContent=describe(row);
      group.addEventListener('click',()=>{status.textContent=describe(row)});
      const seen=new Set();
      for(const [lon,lat] of row[5]) {
        const id=lon+','+lat;
        if (seen.has(id)) continue;
        seen.add(id);
        svgNode(group,'circle',{cx:(lon+75)*16.5,cy:(6-lat)*17,r:2+Math.sqrt(row[2])/4,fill:'#145c4e','fill-opacity':'.69',stroke:'#fff','stroke-width':'.4'});
      }
    }
    status.textContent=rows.length ? rows.length+' registros · Maior concentração: '+describe(rows[0]) : 'Nenhum registro atende aos filtros.';
    table(rows.map(r=>[r[0],'BR-'+String(r[1]).padStart(3,'0'),fmt(r[3],1)+' a '+fmt(r[4],1),fmt(r[2],2)]));
  }
  state.addEventListener('change',draw);min.addEventListener('input',draw);draw();
}
